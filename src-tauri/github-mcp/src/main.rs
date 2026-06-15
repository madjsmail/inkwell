/// github-mcp — GitHub MCP Server (Rust)
///
/// Protocol: JSON-RPC 2.0 over stdio, newline-delimited.
/// Claude Desktop spawns this binary and talks to it via stdin/stdout.
/// Logs go to stderr only — stdout is reserved for the protocol.
///
/// Tools:
///   list_repos    — list the authenticated user's repositories
///   get_readme    — read a repo's README
///   update_readme — overwrite a repo's README
///   get_file      — read any file from a repo
///   push_file     — create or update any file in a repo (use for syncing inkwell notes)
///
/// Required env vars:
///   GITHUB_TOKEN  — personal access token with `repo` scope
///   GITHUB_OWNER  — default owner/org (used when owner is omitted from tool args)

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};

const GITHUB_API: &str = "https://api.github.com";

// ── GitHub API helpers ────────────────────────────────────────────────────────

struct GhClient {
    token: String,
    default_owner: String,
}

impl GhClient {
    fn get(&self, path: &str) -> Result<Value, String> {
        let url = format!("{GITHUB_API}{path}");
        ureq::get(&url)
            .set("Authorization", &format!("Bearer {}", self.token))
            .set("Accept", "application/vnd.github+json")
            .set("User-Agent", "inkwell-github-mcp/0.1")
            .set("X-GitHub-Api-Version", "2022-11-28")
            .call()
            .map_err(|e| format!("GitHub GET {path} failed: {e}"))?
            .into_json::<Value>()
            .map_err(|e| format!("JSON parse error: {e}"))
    }

    fn put(&self, path: &str, body: Value) -> Result<Value, String> {
        let url = format!("{GITHUB_API}{path}");
        ureq::put(&url)
            .set("Authorization", &format!("Bearer {}", self.token))
            .set("Accept", "application/vnd.github+json")
            .set("User-Agent", "inkwell-github-mcp/0.1")
            .set("X-GitHub-Api-Version", "2022-11-28")
            .send_json(body)
            .map_err(|e| format!("GitHub PUT {path} failed: {e}"))?
            .into_json::<Value>()
            .map_err(|e| format!("JSON parse error: {e}"))
    }

    /// Resolve owner: use arg if provided, else fall back to GITHUB_OWNER env var.
    fn owner<'a>(&'a self, args: &'a Value) -> &'a str {
        args.get("owner")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .unwrap_or(&self.default_owner)
    }

    /// Fetch a file's content + SHA from the GitHub Contents API.
    /// Returns (decoded_content, sha) on success.
    fn fetch_file(&self, owner: &str, repo: &str, path: &str) -> Result<(String, String), String> {
        let api_path = format!("/repos/{owner}/{repo}/contents/{path}");
        let res = self.get(&api_path)?;

        let sha = res["sha"]
            .as_str()
            .ok_or("Missing sha in response")?
            .to_string();

        let encoded = res["content"]
            .as_str()
            .ok_or("Missing content in response")?;

        // GitHub base64 has embedded newlines — strip them before decoding
        let clean: String = encoded.chars().filter(|c| !c.is_whitespace()).collect();
        let bytes = B64.decode(&clean).map_err(|e| format!("Base64 decode error: {e}"))?;
        let content = String::from_utf8(bytes).map_err(|e| format!("UTF-8 decode error: {e}"))?;

        Ok((content, sha))
    }
}

// ── JSON-RPC types ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct Request {
    #[allow(dead_code)]
    jsonrpc: String,
    id: Option<Value>,
    method: String,
    params: Option<Value>,
}

#[derive(Debug, Serialize)]
struct Response {
    jsonrpc: &'static str,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<RpcError>,
}

#[derive(Debug, Serialize)]
struct RpcError {
    code: i32,
    message: String,
}

impl Response {
    fn ok(id: Value, result: Value) -> Self {
        Self { jsonrpc: "2.0", id, result: Some(result), error: None }
    }
    fn err(id: Value, code: i32, message: impl Into<String>) -> Self {
        Self { jsonrpc: "2.0", id, result: None, error: Some(RpcError { code, message: message.into() }) }
    }
}

fn text_content(text: impl Into<String>) -> Value {
    json!({ "content": [{ "type": "text", "text": text.into() }] })
}

fn error_content(text: impl Into<String>) -> Value {
    json!({ "content": [{ "type": "text", "text": text.into() }], "isError": true })
}

// ── Tool definitions ──────────────────────────────────────────────────────────

fn tools_list() -> Value {
    json!({
        "tools": [
            {
                "name": "list_repos",
                "description": "List repositories for the authenticated GitHub user. Use this to discover which repos exist before reading or updating files.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "per_page": {
                            "type": "integer",
                            "description": "Number of repos to return (default 30, max 100)"
                        }
                    }
                }
            },
            {
                "name": "get_readme",
                "description": "Read the README.md of a GitHub repository.",
                "inputSchema": {
                    "type": "object",
                    "required": ["repo"],
                    "properties": {
                        "owner": {
                            "type": "string",
                            "description": "Repository owner (defaults to GITHUB_OWNER env var)"
                        },
                        "repo": {
                            "type": "string",
                            "description": "Repository name"
                        }
                    }
                }
            },
            {
                "name": "update_readme",
                "description": "Overwrite the README.md of a GitHub repository. Handles SHA automatically.",
                "inputSchema": {
                    "type": "object",
                    "required": ["repo", "content"],
                    "properties": {
                        "owner": {
                            "type": "string",
                            "description": "Repository owner (defaults to GITHUB_OWNER env var)"
                        },
                        "repo": {
                            "type": "string",
                            "description": "Repository name"
                        },
                        "content": {
                            "type": "string",
                            "description": "Full markdown content for the README"
                        },
                        "message": {
                            "type": "string",
                            "description": "Commit message (default: 'docs: update README')"
                        }
                    }
                }
            },
            {
                "name": "get_file",
                "description": "Read any file from a GitHub repository by path.",
                "inputSchema": {
                    "type": "object",
                    "required": ["repo", "path"],
                    "properties": {
                        "owner": {
                            "type": "string",
                            "description": "Repository owner (defaults to GITHUB_OWNER env var)"
                        },
                        "repo": {
                            "type": "string",
                            "description": "Repository name"
                        },
                        "path": {
                            "type": "string",
                            "description": "File path inside the repository, e.g. 'docs/architecture.md'"
                        }
                    }
                }
            },
            {
                "name": "push_file",
                "description": "Create or update any file in a GitHub repository. Use this to sync an inkwell note to GitHub as a markdown doc. Handles SHA automatically for updates.",
                "inputSchema": {
                    "type": "object",
                    "required": ["repo", "path", "content"],
                    "properties": {
                        "owner": {
                            "type": "string",
                            "description": "Repository owner (defaults to GITHUB_OWNER env var)"
                        },
                        "repo": {
                            "type": "string",
                            "description": "Repository name"
                        },
                        "path": {
                            "type": "string",
                            "description": "Target file path in the repo, e.g. 'docs/my-note.md'"
                        },
                        "content": {
                            "type": "string",
                            "description": "Full file content (markdown)"
                        },
                        "message": {
                            "type": "string",
                            "description": "Commit message (default: 'docs: sync from inkwell')"
                        }
                    }
                }
            }
        ]
    })
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

fn handle_list_repos(gh: &GhClient, args: &Value) -> Value {
    let per_page = args.get("per_page").and_then(|v| v.as_u64()).unwrap_or(30).min(100);
    let path = format!("/user/repos?per_page={per_page}&sort=updated&type=owner");

    match gh.get(&path) {
        Ok(repos) => {
            let Some(arr) = repos.as_array() else {
                return error_content("Unexpected response format from GitHub");
            };
            if arr.is_empty() {
                return text_content("No repositories found.");
            }
            let lines: Vec<String> = arr
                .iter()
                .filter_map(|r| {
                    let name = r["full_name"].as_str()?;
                    let desc = r["description"].as_str().unwrap_or("").trim().to_string();
                    let private = r["private"].as_bool().unwrap_or(false);
                    let vis = if private { "private" } else { "public" };
                    Some(if desc.is_empty() {
                        format!("{name} [{vis}]")
                    } else {
                        format!("{name} [{vis}] — {desc}")
                    })
                })
                .collect();
            text_content(format!("{} repositories:\n\n{}", lines.len(), lines.join("\n")))
        }
        Err(e) => error_content(e),
    }
}

fn handle_get_readme(gh: &GhClient, args: &Value) -> Value {
    let Some(repo) = args.get("repo").and_then(|v| v.as_str()) else {
        return error_content("Missing required argument: repo");
    };
    let owner = gh.owner(args);

    match gh.fetch_file(owner, repo, "README.md") {
        Ok((content, _sha)) => text_content(format!("# {owner}/{repo} README\n\n{content}")),
        Err(e) => error_content(format!("Could not fetch README for {owner}/{repo}: {e}")),
    }
}

fn handle_update_readme(gh: &GhClient, args: &Value) -> Value {
    let (Some(repo), Some(content)) = (
        args.get("repo").and_then(|v| v.as_str()),
        args.get("content").and_then(|v| v.as_str()),
    ) else {
        return error_content("Missing required arguments: repo, content");
    };
    let owner = gh.owner(args);
    let message = args.get("message").and_then(|v| v.as_str()).unwrap_or("docs: update README");

    push_file_inner(gh, owner, repo, "README.md", content, message)
}

fn handle_get_file(gh: &GhClient, args: &Value) -> Value {
    let (Some(repo), Some(path)) = (
        args.get("repo").and_then(|v| v.as_str()),
        args.get("path").and_then(|v| v.as_str()),
    ) else {
        return error_content("Missing required arguments: repo, path");
    };
    let owner = gh.owner(args);

    match gh.fetch_file(owner, repo, path) {
        Ok((content, _sha)) => text_content(format!("# {owner}/{repo}/{path}\n\n{content}")),
        Err(e) => error_content(format!("Could not fetch {path} from {owner}/{repo}: {e}")),
    }
}

fn handle_push_file(gh: &GhClient, args: &Value) -> Value {
    let (Some(repo), Some(path), Some(content)) = (
        args.get("repo").and_then(|v| v.as_str()),
        args.get("path").and_then(|v| v.as_str()),
        args.get("content").and_then(|v| v.as_str()),
    ) else {
        return error_content("Missing required arguments: repo, path, content");
    };
    let owner = gh.owner(args);
    let message = args.get("message").and_then(|v| v.as_str()).unwrap_or("docs: sync from inkwell");

    push_file_inner(gh, owner, repo, path, content, message)
}

/// Shared logic for creating or updating a file via the GitHub Contents API.
fn push_file_inner(gh: &GhClient, owner: &str, repo: &str, path: &str, content: &str, message: &str) -> Value {
    // Try to get existing SHA (needed for updates; omit for new files)
    let existing_sha = gh.fetch_file(owner, repo, path).ok().map(|(_, sha)| sha);

    let encoded = B64.encode(content.as_bytes());
    let mut body = json!({
        "message": message,
        "content": encoded
    });

    if let Some(sha) = existing_sha {
        body["sha"] = json!(sha);
        eprintln!("[github-mcp] updating {owner}/{repo}/{path}");
    } else {
        eprintln!("[github-mcp] creating {owner}/{repo}/{path}");
    }

    let api_path = format!("/repos/{owner}/{repo}/contents/{path}");
    match gh.put(&api_path, body) {
        Ok(_) => text_content(format!("✓ {owner}/{repo}/{path} updated — commit: \"{message}\"")),
        Err(e) => error_content(format!("Failed to push {path} to {owner}/{repo}: {e}")),
    }
}

// ── Request dispatcher ────────────────────────────────────────────────────────

fn handle(request: Request, gh: &GhClient) -> Option<Response> {
    let id = request.id.clone().unwrap_or(Value::Null);
    let params = request.params.unwrap_or(json!({}));

    match request.method.as_str() {
        "initialize" => Some(Response::ok(
            id,
            json!({
                "protocolVersion": "2024-11-05",
                "serverInfo": { "name": "github-mcp", "version": "0.1.0" },
                "capabilities": { "tools": {} }
            }),
        )),

        "notifications/initialized" => None,

        "tools/list" => Some(Response::ok(id, tools_list())),

        "tools/call" => {
            let tool_name = params.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let args = params.get("arguments").cloned().unwrap_or(json!({}));

            let result = match tool_name {
                "list_repos"    => handle_list_repos(gh, &args),
                "get_readme"    => handle_get_readme(gh, &args),
                "update_readme" => handle_update_readme(gh, &args),
                "get_file"      => handle_get_file(gh, &args),
                "push_file"     => handle_push_file(gh, &args),
                unknown => error_content(format!("Unknown tool: {unknown}")),
            };

            Some(Response::ok(id, result))
        }

        _ if request.id.is_none() => None,

        other => Some(Response::err(id, -32601, format!("Method not found: {other}"))),
    }
}

// ── Entry point ───────────────────────────────────────────────────────────────

fn main() {
    let token = match std::env::var("GITHUB_TOKEN") {
        Ok(t) if !t.is_empty() => t,
        _ => {
            eprintln!("[github-mcp] ERROR: GITHUB_TOKEN env var is required");
            std::process::exit(1);
        }
    };

    let default_owner = std::env::var("GITHUB_OWNER").unwrap_or_default();
    if default_owner.is_empty() {
        eprintln!("[github-mcp] WARN: GITHUB_OWNER not set — owner must be provided in each tool call");
    }

    eprintln!("[github-mcp] started — default owner: {}", if default_owner.is_empty() { "(none)" } else { &default_owner });

    let gh = GhClient { token, default_owner };

    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut stdout = stdout.lock();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) if !l.trim().is_empty() => l,
            _ => continue,
        };

        let request: Request = match serde_json::from_str(&line) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[github-mcp] parse error: {e}");
                continue;
            }
        };

        eprintln!("[github-mcp] ← {}", request.method);

        if let Some(response) = handle(request, &gh) {
            let json = serde_json::to_string(&response).unwrap();
            writeln!(stdout, "{json}").unwrap();
            stdout.flush().unwrap();
        }
    }

    eprintln!("[github-mcp] stdin closed, shutting down");
}
