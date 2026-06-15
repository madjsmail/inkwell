import { useState, useEffect, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  GitBranch,
  X,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  RefreshCw,
  Search,
  Check,
  FileText,
} from "lucide-react";
import { Select } from "../ui/Select";
import { cn } from "../../lib/utils";
import { slugifyTitle } from "../../lib/utils";
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

type PushResult = { noteId: string; ok: boolean; url?: string; error?: string };

export function GitHubSyncDialog({ open, onClose, noteId }: Props) {
  const { notes, updateNote } = useAppStore();
  const note = notes.find((n) => n.id === noteId);

  // ── Repos ──────────────────────────────────────────────────────────────────
  const [repos, setRepos] = useState<GhRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string>("");

  // ── Note selection ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set([noteId]));
  const [noteSearch, setNoteSearch] = useState("");

  const filteredNotes = useMemo(() => {
    const q = noteSearch.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.folder ?? "").toLowerCase().includes(q),
    );
  }, [notes, noteSearch]);

  // ── Path config ────────────────────────────────────────────────────────────
  // Single note: custom file path. Multiple notes: folder prefix.
  const isMulti = selectedIds.size > 1;

  const [filePath, setFilePath] = useState(
    note ? `docs/${slugifyTitle(note.title) || "note"}.md` : "docs/note.md",
  );
  const [folderPrefix, setFolderPrefix] = useState("docs/");
  const [commitMsg, setCommitMsg] = useState("");

  // ── Push state ─────────────────────────────────────────────────────────────
  const [pushing, setPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState<{ done: number; total: number } | null>(null);
  const [pushResults, setPushResults] = useState<PushResult[]>([]);

  // ── Pull state ─────────────────────────────────────────────────────────────
  const [pulling, setPulling] = useState(false);
  const [pullResult, setPullResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set([noteId]));
    setNoteSearch("");
    setPushResults([]);
    setPullResult(null);
    setFilePath(
      note ? `docs/${slugifyTitle(note.title) || "note"}.md` : "docs/note.md",
    );
    if (!isGithubConfigured()) {
      setReposError("GitHub not configured. Go to Settings → GitHub.");
      return;
    }
    setLoadingRepos(true);
    setReposError(null);
    listRepos(50)
      .then((r) => {
        setRepos(r);
        if (!selectedRepo && r.length > 0) {
          const match = r.find((repo) => repo.name === "inkwell");
          setSelectedRepo(match?.full_name ?? r[0].full_name);
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

  const toggleNote = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getNotePath = (n: typeof note) => {
    if (isMulti) {
      const slug = slugifyTitle(n!.title) || "note";
      const prefix = folderPrefix.endsWith("/") ? folderPrefix : `${folderPrefix}/`;
      return `${prefix}${slug}.md`;
    }
    return filePath;
  };

  // ── Push ───────────────────────────────────────────────────────────────────
  const handlePush = async () => {
    const toSync = notes.filter((n) => selectedIds.has(n.id));
    setPushing(true);
    setPushResults([]);
    setPushProgress({ done: 0, total: toSync.length });

    const results: PushResult[] = [];
    for (let i = 0; i < toSync.length; i++) {
      const n = toSync[i];
      const path = getNotePath(n);
      const msg =
        commitMsg.trim() ||
        (toSync.length === 1
          ? `docs: sync "${n.title}" from inkwell`
          : `docs: sync ${toSync.length} notes from inkwell`);
      try {
        const url = await syncNoteToGithub(repoOwner, repoName, path, n.content, msg);
        results.push({ noteId: n.id, ok: true, url });
      } catch (e) {
        const raw = e instanceof Error ? e.message : "Push failed.";
        const friendly = raw.includes("403")
          ? `${raw} — token needs write access (repo scope or Contents → Read and write).`
          : raw;
        results.push({ noteId: n.id, ok: false, error: friendly });
      }
      setPushProgress({ done: i + 1, total: toSync.length });
    }

    setPushResults(results);
    setPushing(false);
    setPushProgress(null);
  };

  // ── Pull (single note only) ────────────────────────────────────────────────
  const handlePull = async () => {
    const target = notes.find((n) => selectedIds.has(n.id));
    if (!target) return;
    if (
      !confirm(
        `Replace "${target.title}" with the version from ${repoOwner}/${repoName}/${filePath}?`,
      )
    )
      return;
    setPulling(true);
    setPullResult(null);
    try {
      const content = await pullNoteFromGithub(repoOwner, repoName, filePath);
      updateNote(target.id, content);
      setPullResult({ ok: true, msg: "Pulled and updated note." });
    } catch (e) {
      setPullResult({ ok: false, msg: e instanceof Error ? e.message : "Pull failed." });
    } finally {
      setPulling(false);
    }
  };

  const isBusy = pushing || pulling;
  const canSync = !!selectedRepo && selectedIds.size > 0 && !isBusy;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "w-[520px] max-h-[88vh] bg-panel border border-border rounded-xl shadow-2xl",
            "flex flex-col overflow-hidden focus:outline-none",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
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

          <div className="overflow-y-auto flex-1">
            <div className="p-5 space-y-4">

              {/* ── Note selector ─────────────────────────────────────────── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
                    Notes to push
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedIds.size} selected
                  </span>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-tertiary pointer-events-none" />
                  <input
                    type="text"
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    placeholder="Search notes…"
                    className={cn(
                      "w-full pl-7 pr-3 py-1.5 rounded-lg text-xs bg-surface border border-border",
                      "text-foreground placeholder:text-tertiary",
                      "focus:outline-none focus:border-accent/50 transition-colors",
                    )}
                  />
                </div>

                {/* Note list */}
                <div className="max-h-[160px] overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {filteredNotes.length === 0 ? (
                    <p className="px-3 py-2.5 text-xs text-muted-foreground">No notes found.</p>
                  ) : (
                    filteredNotes.map((n) => {
                      const checked = selectedIds.has(n.id);
                      return (
                        <button
                          key={n.id}
                          onClick={() => toggleNote(n.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                            checked ? "bg-accent/10" : "hover:bg-surface",
                          )}
                        >
                          {/* Checkbox */}
                          <div
                            className={cn(
                              "w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-colors",
                              checked
                                ? "bg-accent border-accent"
                                : "border-border bg-surface",
                            )}
                          >
                            {checked && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground truncate font-medium">
                              {n.title}
                            </p>
                            {n.folder && (
                              <p className="text-[10px] text-tertiary truncate">{n.folder}</p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── Repository ────────────────────────────────────────────── */}
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

              {/* ── Path config ──────────────────────────────────────────── */}
              {isMulti ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
                    Folder prefix in repo
                  </label>
                  <input
                    type="text"
                    value={folderPrefix}
                    onChange={(e) => setFolderPrefix(e.target.value)}
                    placeholder="docs/"
                    className={cn(
                      "w-full px-3 py-2 rounded-lg text-xs bg-surface border border-border",
                      "text-foreground placeholder:text-tertiary font-mono",
                      "focus:outline-none focus:border-accent/50 transition-colors",
                    )}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Each note will be saved as{" "}
                    <span className="font-mono text-foreground/70">
                      {folderPrefix.endsWith("/") ? folderPrefix : `${folderPrefix}/`}
                      {"<slug>.md"}
                    </span>
                  </p>
                </div>
              ) : (
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
              )}

              {/* ── Commit message ────────────────────────────────────────── */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
                  Commit message{" "}
                  <span className="normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  placeholder={
                    isMulti
                      ? `docs: sync ${selectedIds.size} notes from inkwell`
                      : `docs: sync "${note.title}" from inkwell`
                  }
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-xs bg-surface border border-border",
                    "text-foreground placeholder:text-tertiary",
                    "focus:outline-none focus:border-accent/50 transition-colors",
                  )}
                />
              </div>

              {/* ── Push results ─────────────────────────────────────────── */}
              {pushResults.length > 0 && (
                <div className="space-y-1.5">
                  {pushResults.map((r) => {
                    const n = notes.find((x) => x.id === r.noteId);
                    return (
                      <div
                        key={r.noteId}
                        className={cn(
                          "flex items-start gap-2 px-3 py-2 rounded-lg text-xs",
                          r.ok
                            ? "bg-green-500/10 border border-green-500/20 text-green-400"
                            : "bg-red-500/10 border border-red-500/20 text-red-400",
                        )}
                      >
                        <span className="flex-1 truncate">
                          <span className="font-medium">{n?.title ?? r.noteId}</span>
                          {r.ok ? " — pushed" : `: ${r.error}`}
                        </span>
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 hover:opacity-75"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pull result */}
              {pullResult && (
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
                    pullResult.ok
                      ? "bg-green-500/10 border border-green-500/20 text-green-400"
                      : "bg-red-500/10 border border-red-500/20 text-red-400",
                  )}
                >
                  {pullResult.msg}
                </div>
              )}

              {/* ── Actions ──────────────────────────────────────────────── */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handlePush}
                  disabled={!canSync}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors",
                    "bg-accent text-white hover:opacity-90",
                    !canSync && "opacity-40 pointer-events-none",
                  )}
                >
                  {pushing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {pushProgress
                        ? `Pushing ${pushProgress.done}/${pushProgress.total}…`
                        : "Pushing…"}
                    </>
                  ) : (
                    <>
                      <ArrowUp className="w-3.5 h-3.5" />
                      Push {selectedIds.size > 1 ? `${selectedIds.size} notes` : "note"}
                    </>
                  )}
                </button>
                <button
                  onClick={handlePull}
                  disabled={!canSync || isMulti}
                  title={isMulti ? "Select a single note to pull" : undefined}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors",
                    "border-border text-muted-foreground hover:text-foreground hover:border-accent/50",
                    (!canSync || isMulti) && "opacity-40 pointer-events-none",
                  )}
                >
                  {pulling ? (
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
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
