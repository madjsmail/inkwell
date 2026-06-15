import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  GitBranch,
  X,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Select } from "../ui/Select";
import { cn } from "../../lib/utils";
import {
  listRepos,
  syncNoteToGithub,
  pullNoteFromGithub,
  getGithubOwner,
  isGithubConfigured,
  type GhRepo,
} from "../../lib/github";
import { useAppStore } from "../../store/useAppStore";

interface Props {
  open: boolean;
  onClose: () => void;
  noteId: string;
}

export function GitHubSyncDialog({ open, onClose, noteId }: Props) {
  const { notes, updateNote } = useAppStore();
  const note = notes.find((n) => n.id === noteId);

  // ── State ──────────────────────────────────────────────────────────────────
  const [repos, setRepos] = useState<GhRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);

  // Persisted per-note target (stored in noteMeta via store in a future pass;
  // for now keep in local state and seed from note.githubRepo/githubPath if set)
  const [selectedRepo, setSelectedRepo] = useState<string>(
    (note as any)?.githubRepo ?? "",
  );
  const [filePath, setFilePath] = useState<string>(
    (note as any)?.githubPath ??
      (note ? `docs/${note.title.toLowerCase().replace(/\s+/g, "-")}.md` : ""),
  );
  const [commitMsg, setCommitMsg] = useState("");

  const [syncing, setSyncing] = useState<"push" | "pull" | null>(null);
  const [result, setResult] = useState<{
    ok: boolean;
    msg: string;
    url?: string;
  } | null>(null);

  // ── Load repos on open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setResult(null);
    if (!isGithubConfigured()) {
      setReposError("GitHub not configured. Go to Settings → GitHub.");
      return;
    }
    setLoadingRepos(true);
    setReposError(null);
    listRepos(50)
      .then((r) => {
        setRepos(r);
        // Pre-select if note already has a target
        if (!selectedRepo && r.length > 0) {
          const inkwellRepo = r.find((repo) => repo.name === "inkwell");
          setSelectedRepo(inkwellRepo?.name ?? r[0].name);
        }
      })
      .catch((e) =>
        setReposError(e instanceof Error ? e.message : "Failed to load repos"),
      )
      .finally(() => setLoadingRepos(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!note) return null;

  const owner = getGithubOwner();
  const [repoOwner, repoName] = selectedRepo.includes("/")
    ? selectedRepo.split("/", 2)
    : [owner, selectedRepo];

  // ── Push note → GitHub ─────────────────────────────────────────────────────
  const handlePush = async () => {
    setSyncing("push");
    setResult(null);
    try {
      const msg = commitMsg.trim() || `docs: sync "${note.title}" from inkwell`;
      const url = await syncNoteToGithub(
        repoOwner,
        repoName,
        filePath,
        note.content,
        msg,
      );
      setResult({ ok: true, msg: "Pushed successfully.", url });
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Push failed.";
      const msg = raw.includes("403")
        ? `${raw} — your token needs write access. Classic PAT: enable "repo" scope. Fine-grained PAT: set Contents → Read and write.`
        : raw;
      setResult({ ok: false, msg });
    } finally {
      setSyncing(null);
    }
  };

  // ── Pull GitHub → note ─────────────────────────────────────────────────────
  const handlePull = async () => {
    if (
      !confirm(
        `Replace note content with the version from ${repoOwner}/${repoName}/${filePath}?`,
      )
    )
      return;
    setSyncing("pull");
    setResult(null);
    try {
      const content = await pullNoteFromGithub(repoOwner, repoName, filePath);
      updateNote(note.id, content);
      setResult({ ok: true, msg: "Pulled and updated note." });
    } catch (e) {
      setResult({
        ok: false,
        msg: e instanceof Error ? e.message : "Pull failed.",
      });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "w-[480px] bg-panel border border-border rounded-xl shadow-2xl",
            "flex flex-col overflow-hidden focus:outline-none",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-foreground" />
              <Dialog.Title className="text-sm font-semibold text-foreground">
                Sync with GitHub
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-5 space-y-4">
            {/* Note info */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
              <span className="text-xs text-muted-foreground">Note:</span>
              <span className="text-xs font-medium text-foreground truncate">
                {note.title}
              </span>
            </div>

            {/* Repo selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
                Repository
              </label>
              {loadingRepos ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Loading repositories…
                </div>
              ) : reposError ? (
                <p className="text-xs text-red-400">{reposError}</p>
              ) : (
                <Select
                  value={selectedRepo}
                  onChange={setSelectedRepo}
                  options={repos.map((r) => ({
                    value: r.full_name,
                    label: r.full_name,
                    description: r.private ? "· private" : undefined,
                  }))}
                  placeholder="Select a repository…"
                />
              )}
            </div>

            {/* File path */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
                File path in repo
              </label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="docs/my-note.md"
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-xs bg-surface border border-border",
                  "text-foreground placeholder:text-tertiary font-mono",
                  "focus:outline-none focus:border-accent/50 transition-colors",
                )}
              />
            </div>

            {/* Commit message */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
                Commit message{" "}
                <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                placeholder={`docs: sync "${note.title}" from inkwell`}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-xs bg-surface border border-border",
                  "text-foreground placeholder:text-tertiary",
                  "focus:outline-none focus:border-accent/50 transition-colors",
                )}
              />
            </div>

            {/* Result */}
            {result && (
              <div
                className={cn(
                  "flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs",
                  result.ok
                    ? "bg-green-500/10 border border-green-500/20 text-green-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400",
                )}
              >
                <span className="flex-1">{result.msg}</span>
                {result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 hover:opacity-75"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handlePush}
                disabled={!!syncing || !selectedRepo || !filePath}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors",
                  "bg-accent text-white hover:opacity-90",
                  (!!syncing || !selectedRepo || !filePath) &&
                    "opacity-40 pointer-events-none",
                )}
              >
                {syncing === "push" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pushing…
                  </>
                ) : (
                  <>
                    <ArrowUp className="w-3.5 h-3.5" /> Push to GitHub
                  </>
                )}
              </button>
              <button
                onClick={handlePull}
                disabled={!!syncing || !selectedRepo || !filePath}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors",
                  "border-border text-muted-foreground hover:text-foreground hover:border-accent/50",
                  (!!syncing || !selectedRepo || !filePath) &&
                    "opacity-40 pointer-events-none",
                )}
              >
                {syncing === "pull" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pulling…
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3.5 h-3.5" /> Pull from GitHub
                  </>
                )}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
