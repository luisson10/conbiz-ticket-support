"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  attachReleaseItems,
  createReleaseDraft,
  deleteRelease,
  deleteReleaseDraft,
  detachReleaseItem,
  getReleaseCandidateTickets,
  getReleaseDetails,
  getReleaseTags,
  getReleaseTimeline,
  publishRelease,
  updateRelease,
  upsertReleaseTag,
} from "@/app/actions/releases";
import type {
  ReleaseCandidateTicketDto,
  ReleaseDetailsDto,
  ReleaseTagDto,
  ReleaseTimelineItemDto,
} from "@/lib/contracts/releases";
import {
  Loader2,
  Plus,
  Tag,
  Clock3,
  Sparkles,
  ChevronDown,
  ChevronRight,
  X,
  CheckCircle2,
} from "lucide-react";

type ReleasesViewProps = {
  accountId: string | null;
  isAdmin: boolean;
  onOpenTicket: (issueId: string) => void;
};

type ReleaseEditor = {
  title: string;
  description: string;
  tagIds: string[];
};

const emptyReleaseEditor: ReleaseEditor = {
  title: "",
  description: "",
  tagIds: [],
};
const TOAST_DURATION_MS = 4500;

export default function ReleasesView({ accountId, isAdmin, onOpenTicket }: ReleasesViewProps) {
  const [loading, setLoading] = useState(false);
  const [releases, setReleases] = useState<ReleaseTimelineItemDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsById, setDetailsById] = useState<Record<string, ReleaseDetailsDto>>({});

  const [tags, setTags] = useState<ReleaseTagDto[]>([]);
  const [candidateTickets, setCandidateTickets] = useState<ReleaseCandidateTicketDto[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [tagQuery, setTagQuery] = useState("");
  const [tagInputFocused, setTagInputFocused] = useState(false);
  const [editor, setEditor] = useState<ReleaseEditor>(emptyReleaseEditor);
  const [editingReleaseId, setEditingReleaseId] = useState<string | null>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [ticketSearch, setTicketSearch] = useState("");
  const [createSelectedIssueIds, setCreateSelectedIssueIds] = useState<string[]>([]);
  const [createTicketSearch, setCreateTicketSearch] = useState("");

  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [toastProgress, setToastProgress] = useState(0);
  const toastPausedRef = useRef(false);
  const toastIdRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  function showToast(text: string) {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, text });
  }

  const loadTimeline = useCallback(async (reset = true, cursor?: string | null) => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    const response = await getReleaseTimeline({
      accountId,
      cursor: reset ? undefined : cursor || undefined,
      limit: 12,
      status: isAdmin ? "ALL" : undefined,
    });
    if (response.success) {
      setReleases((prev) => (reset ? response.data.items : [...prev, ...response.data.items]));
      setNextCursor(response.data.nextCursor);
    } else {
      setError(response.error);
    }
    setLoading(false);
  }, [accountId, isAdmin]);

  async function loadTags() {
    const res = await getReleaseTags();
    if (res.success) setTags(res.data);
  }

  const loadCandidates = useCallback(async () => {
    if (!isAdmin || !accountId) return;
    const candidateRes = await getReleaseCandidateTickets({ accountId });
    if (candidateRes.success) {
      setCandidateTickets(candidateRes.data);
    }
  }, [isAdmin, accountId]);

  useEffect(() => {
    if (!accountId) return;
    setExpandedId(null);
    setDetailsById({});
    void loadTimeline(true);
    void loadTags();
    void loadCandidates();
  }, [accountId, loadCandidates, loadTimeline, isAdmin]);

  async function expandRelease(releaseId: string) {
    if (!accountId) return;
    if (expandedId === releaseId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(releaseId);
    if (detailsById[releaseId]) return;

    const response = await getReleaseDetails(releaseId, accountId);
    if (response.success) {
      setDetailsById((prev) => ({ ...prev, [releaseId]: response.data }));
    }
  }

  const filteredCandidates = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase();
    if (!q) return candidateTickets;
    return candidateTickets.filter((ticket) =>
      [ticket.identifier, ticket.title].some((field) => field.toLowerCase().includes(q))
    );
  }, [candidateTickets, ticketSearch]);

  const createFilteredCandidates = useMemo(() => {
    const q = createTicketSearch.trim().toLowerCase();
    const base = candidateTickets.filter(
      (ticket) => !createSelectedIssueIds.includes(ticket.issueId)
    );
    if (!q) return base;
    return base.filter((ticket) =>
      [ticket.identifier, ticket.title].some((field) => field.toLowerCase().includes(q))
    );
  }, [candidateTickets, createSelectedIssueIds, createTicketSearch]);

  const createSelectedTickets = useMemo(
    () =>
      candidateTickets.filter((ticket) => createSelectedIssueIds.includes(ticket.issueId)),
    [candidateTickets, createSelectedIssueIds]
  );

  const allTagOptions = useMemo(() => {
    const map = new Map<string, ReleaseTagDto>();
    tags.forEach((tag) => map.set(tag.id, tag));
    releases.forEach((release) => {
      release.tags.forEach((tag) => {
        if (!map.has(tag.id)) {
          map.set(tag.id, tag);
        }
      });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [tags, releases]);

  async function handleCreateDraft() {
    if (!accountId) {
      setError("Select an account before creating a release.");
      return;
    }
    if (!editor.title.trim()) {
      setError("Title is required.");
      return;
    }

    setError(null);
    setToast(null);

    const response = await createReleaseDraft({
      title: editor.title,
      description: editor.description,
      accountIds: [accountId],
      tagIds: editor.tagIds,
    });

    if (!response.success) {
      setError(response.error);
      return;
    }

    let createdRelease = response.data;
    if (createSelectedIssueIds.length > 0) {
      const attach = await attachReleaseItems({
        releaseId: response.data.id,
        issueIds: createSelectedIssueIds,
        accountIds: [accountId],
      });
      if (!attach.success) {
        setError(attach.error);
      } else {
        createdRelease = { ...response.data, itemCount: attach.data.attached };
      }
    }

    setReleases((prev) => [createdRelease, ...prev]);
    setEditor(emptyReleaseEditor);
    setTagQuery("");
    setCreateSelectedIssueIds([]);
    setCreateTicketSearch("");
    setCreateModalOpen(false);
    showToast("Draft release created.");
  }

  async function handlePublish(releaseId: string) {
    const response = await publishRelease({ releaseId });
    if (!response.success) {
      setError(response.error);
      return;
    }

    setReleases((prev) => prev.map((release) => (release.id === releaseId ? response.data : release)));
    setDetailsById((prev) => {
      const existing = prev[releaseId];
      if (!existing) return prev;
      return {
        ...prev,
        [releaseId]: {
          ...existing,
          ...response.data,
        },
      };
    });
    showToast("Release published.");
  }

  async function handleDeleteDraft(releaseId: string) {
    const response = await deleteReleaseDraft(releaseId);
    if (!response.success) {
      setError(response.error);
      return;
    }

    setReleases((prev) => prev.filter((release) => release.id !== releaseId));
    setExpandedId((current) => (current === releaseId ? null : current));
  }

  async function handleDeleteRelease(releaseId: string) {
    const confirmed = window.confirm("Estas seguro de que deseas eliminar este release?");
    if (!confirmed) return;

    const response = await deleteRelease(releaseId);
    if (!response.success) {
      setError(response.error);
      return;
    }

    setReleases((prev) => prev.filter((release) => release.id !== releaseId));
    setExpandedId((current) => (current === releaseId ? null : current));
    setEditingReleaseId((current) => (current === releaseId ? null : current));
    showToast("Release deleted.");
  }

  async function handleSaveRelease(releaseId: string) {
    if (!accountId) {
      setError("Select an account before updating a release.");
      return;
    }
    const response = await updateRelease({
      releaseId,
      title: editor.title,
      description: editor.description,
      accountIds: [accountId],
      tagIds: editor.tagIds,
    });

    if (!response.success) {
      setError(response.error);
      return;
    }

    setEditingReleaseId(null);
    setReleases((prev) => prev.map((release) => (release.id === releaseId ? response.data : release)));
    showToast("Release updated.");
  }

  async function ensureTagId(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const existing = allTagOptions.find((tag) => tag.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;

    const response = await upsertReleaseTag({ name: trimmed });
    if (!response.success) {
      setError(response.error);
      return null;
    }

    setTags((prev) => [...prev, response.data]);
    return response.data.id;
  }

  async function handleAddTagFromQuery() {
    const tagId = await ensureTagId(tagQuery);
    if (!tagId) return;
    setEditor((prev) =>
      prev.tagIds.includes(tagId) ? prev : { ...prev, tagIds: [...prev.tagIds, tagId] }
    );
    setTagQuery("");
  }

  function handleRemoveSelectedTag(tagId: string) {
    setEditor((prev) => ({ ...prev, tagIds: prev.tagIds.filter((id) => id !== tagId) }));
  }

  const selectedTags = useMemo(() => {
    const selectedMap = new Map(allTagOptions.map((tag) => [tag.id, tag]));
    return editor.tagIds
      .map((id) => selectedMap.get(id))
      .filter((tag): tag is ReleaseTagDto => Boolean(tag));
  }, [allTagOptions, editor.tagIds]);

  const suggestedTags = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    const available = allTagOptions.filter((tag) => !editor.tagIds.includes(tag.id));
    if (!q) return [];
    return available.filter((tag) => tag.name.toLowerCase().includes(q)).slice(0, 6);
  }, [allTagOptions, editor.tagIds, tagQuery]);

  function startCreateRelease() {
    if (!isAdmin) return;
    setError(null);
    setToast(null);
    setEditor(emptyReleaseEditor);
    setTagQuery("");
    setCreateSelectedIssueIds([]);
    setCreateTicketSearch("");
    setCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (loading) return;
    setCreateModalOpen(false);
  }

  async function handleSelectSuggestedTag(tagId: string) {
    setEditor((prev) =>
      prev.tagIds.includes(tagId) ? prev : { ...prev, tagIds: [...prev.tagIds, tagId] }
    );
    setTagQuery("");
  }

  async function handleTagEnter() {
    const normalized = tagQuery.trim().toLowerCase();
    if (!normalized) return;
    if (suggestedTags.length > 0) {
      const exact = suggestedTags.find((tag) => tag.name.toLowerCase() === normalized);
      const target = exact || suggestedTags[0];
      await handleSelectSuggestedTag(target.id);
      return;
    }
    await handleAddTagFromQuery();
  }

  async function handleAttachItems(releaseId: string, releaseAccountIds: string[]) {
    if (!accountId || selectedIssueIds.length === 0) return;
    const response = await attachReleaseItems({
      releaseId,
      issueIds: selectedIssueIds,
      accountIds: releaseAccountIds.length > 0 ? releaseAccountIds : [accountId],
    });

    if (!response.success) {
      setError(response.error);
      return;
    }

    const details = await getReleaseDetails(releaseId, accountId);
    if (details.success) {
      setDetailsById((prev) => ({ ...prev, [releaseId]: details.data }));
      setReleases((prev) =>
        prev.map((release) =>
          release.id === releaseId ? { ...release, itemCount: details.data.items.length } : release
        )
      );
    }
    setSelectedIssueIds([]);
    showToast(`${response.data.attached} ticket(s) attached.`);
  }

  async function handleDetachItem(releaseId: string, issueId: string) {
    if (!accountId) return;
    const response = await detachReleaseItem({ releaseId, issueId });
    if (!response.success) {
      setError(response.error);
      return;
    }

    const details = await getReleaseDetails(releaseId, accountId);
    if (details.success) {
      setDetailsById((prev) => ({ ...prev, [releaseId]: details.data }));
      setReleases((prev) =>
        prev.map((release) =>
          release.id === releaseId ? { ...release, itemCount: details.data.items.length } : release
        )
      );
    }
  }

  function initEditorFromRelease(release: ReleaseTimelineItemDto) {
    setEditor({
      title: release.title,
      description: release.description,
      tagIds: release.tags.map((tag) => tag.id),
    });
    setTagQuery("");
    setSelectedIssueIds([]);
    setEditingReleaseId(release.id);
    setExpandedId(release.id);
  }

  useEffect(() => {
    if (!toast) return;
    setToastProgress(0);
    toastPausedRef.current = false;

    let elapsed = 0;
    const tickMs = 50;
    const intervalId = window.setInterval(() => {
      if (toastPausedRef.current) return;
      elapsed += tickMs;
      const progress = Math.min((elapsed / TOAST_DURATION_MS) * 100, 100);
      setToastProgress(progress);
      if (progress >= 100) {
        setToast(null);
        window.clearInterval(intervalId);
      }
    }, tickMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [toast]);

  if (!accountId) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        Selecciona una cuenta para visualizar releases.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <div className="flex justify-end">
          <button
            onClick={startCreateRelease}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Nuevo release
          </button>
        </div>
      ) : null}

      {createModalOpen && isAdmin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Sparkles className="h-4 w-4" />
                Crear draft de release
              </div>
              <button
                onClick={closeCreateModal}
                className="rounded-lg border border-gray-200 p-2 text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
              <input
                value={editor.title}
                onChange={(e) => setEditor((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Titulo de release"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <div className="relative">
                <input
                  value={tagQuery}
                  onFocus={() => setTagInputFocused(true)}
                  onBlur={() => setTagInputFocused(false)}
                  onChange={(e) => setTagQuery(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleTagEnter();
                    }
                  }}
                  placeholder="Agregar o reutilizar tag"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                {(tagInputFocused || tagQuery.trim().length > 0) && suggestedTags.length > 0 ? (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                    {suggestedTags.map((tag) => (
                      <button
                        key={tag.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          void handleSelectSuggestedTag(tag.id);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Tag className="h-3.5 w-3.5 text-gray-400" />
                        {tag.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            {selectedTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                  >
                    {tag.name}
                    <button
                      onClick={() => {
                        handleRemoveSelectedTag(tag.id);
                      }}
                      className="text-gray-500 hover:text-red-600"
                      title={`Quitar ${tag.name}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
            <textarea
              value={editor.description}
              onChange={(e) => setEditor((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              placeholder="Descripcion"
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="mt-3 rounded-xl border border-gray-200 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tickets del release
              </div>
              <input
                value={createTicketSearch}
                onChange={(e) => setCreateTicketSearch(e.target.value)}
                placeholder="Buscar tickets para agregar"
                className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              {createSelectedTickets.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {createSelectedTickets.map((ticket) => (
                    <span
                      key={ticket.issueId}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                    >
                      {ticket.identifier}
                      <button
                        onClick={() =>
                          setCreateSelectedIssueIds((prev) =>
                            prev.filter((id) => id !== ticket.issueId)
                          )
                        }
                        className="text-gray-500 hover:text-red-600"
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {createFilteredCandidates.slice(0, 80).map((ticket) => (
                  <button
                    key={ticket.issueId}
                    onClick={() =>
                      setCreateSelectedIssueIds((prev) =>
                        prev.includes(ticket.issueId) ? prev : [...prev, ticket.issueId]
                      )
                    }
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="text-xs font-semibold text-gray-400">{ticket.identifier}</span>
                    <span className="truncate">{ticket.title}</span>
                  </button>
                ))}
                {createFilteredCandidates.length === 0 ? (
                  <div className="py-4 text-center text-sm text-gray-400">
                    No hay tickets disponibles.
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={closeCreateModal}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  void handleCreateDraft();
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Guardar draft
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="space-y-4">
        {releases.map((release) => {
          const isExpanded = expandedId === release.id;
          const details = detailsById[release.id];
          const isEditing = editingReleaseId === release.id;

          return (
            <div key={release.id} className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="relative hidden md:block">
                <div className="absolute bottom-0 left-6 top-0 w-px bg-gray-200" />
                <button
                  onClick={() => {
                    void expandRelease(release.id);
                  }}
                  className="sticky top-24 block w-full text-left"
                >
                  <span
                    className={`absolute left-6 top-3 h-3 w-3 -translate-x-1/2 rounded-full border-2 ${
                      isExpanded ? "border-primary bg-primary" : "border-gray-300 bg-white"
                    }`}
                  />
                  <div className="pl-10">
                    <div className="text-xs font-semibold text-gray-500">
                      {(release.publishedAt || release.createdAt).slice(0, 10)}
                    </div>
                    <div className="text-sm font-medium text-gray-800">{release.title}</div>
                  </div>
                </button>
              </div>

              <article className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex w-full items-start justify-between gap-3 px-4 py-4">
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            value={editor.title}
                            onChange={(e) =>
                              setEditor((prev) => ({ ...prev, title: e.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-base font-semibold text-gray-900"
                          />
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              release.status === "PUBLISHED"
                                ? "bg-green-50 text-green-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {release.status}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            value={tagQuery}
                            onFocus={() => setTagInputFocused(true)}
                            onBlur={() => setTagInputFocused(false)}
                            onChange={(e) => setTagQuery(e.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void handleTagEnter();
                              }
                            }}
                            placeholder="Agregar o reutilizar tag"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                          {(tagInputFocused || tagQuery.trim().length > 0) &&
                          suggestedTags.length > 0 ? (
                            <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                              {suggestedTags.map((tag) => (
                                <span
                                  key={tag.id}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    void handleSelectSuggestedTag(tag.id);
                                  }}
                                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Tag className="h-3.5 w-3.5 text-gray-400" />
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        {selectedTags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedTags.map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                              >
                                {tag.name}
                                <button
                                  onClick={() => {
                                    handleRemoveSelectedTag(tag.id);
                                  }}
                                  className="text-gray-500 hover:text-red-600"
                                >
                                  x
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          {release.publishedAt
                            ? `Publicado: ${new Date(release.publishedAt).toLocaleDateString()}`
                            : `Creado: ${new Date(release.createdAt).toLocaleDateString()}`}
                          <span>•</span>
                          <span>{release.itemCount} tickets</span>
                        </div>
                        <textarea
                          value={editor.description}
                          onChange={(e) =>
                            setEditor((prev) => ({ ...prev, description: e.target.value }))
                          }
                          rows={4}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          void expandRelease(release.id);
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900">{release.title}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              release.status === "PUBLISHED"
                                ? "bg-green-50 text-green-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {release.status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {release.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          {release.publishedAt
                            ? `Publicado: ${new Date(release.publishedAt).toLocaleDateString()}`
                            : `Creado: ${new Date(release.createdAt).toLocaleDateString()}`}
                          <span>•</span>
                          <span>{release.itemCount} tickets</span>
                        </div>
                        <p className={`mt-2 text-sm text-gray-600 ${isExpanded ? "" : "line-clamp-2"}`}>
                          {release.description || "No description"}
                        </p>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && isEditing ? (
                      <>
                        <button
                          onClick={() => setEditingReleaseId(null)}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => {
                            void handleSaveRelease(release.id);
                          }}
                          className="rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          Guardar
                        </button>
                        {release.status === "DRAFT" && (
                          <button
                            onClick={() => {
                              void handlePublish(release.id);
                            }}
                            className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white"
                          >
                            Publicar
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (release.status === "DRAFT") {
                              void handleDeleteDraft(release.id);
                              return;
                            }
                            void handleDeleteRelease(release.id);
                          }}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600"
                        >
                          Eliminar
                        </button>
                      </>
                    ) : isAdmin ? (
                      <button
                        onClick={() => initEditorFromRelease(release)}
                        className={`rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 transition ${
                          isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        Editar
                      </button>
                    ) : null}
                    <button
                      onClick={() => {
                        void expandRelease(release.id);
                      }}
                      className="text-gray-400"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4">
                    {!details ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading details...
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Tickets in this release
                          </div>
                          <div className="space-y-2">
                            {details.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-start gap-2 rounded-lg border border-gray-200 px-3 py-2"
                              >
                                <button
                                  onClick={() => onOpenTicket(item.issueId)}
                                  className="flex flex-1 items-start justify-between gap-2 text-left hover:opacity-90"
                                >
                                  <div>
                                    <div className="text-xs font-semibold text-gray-400">{item.issueIdentifier}</div>
                                    <div className="text-sm font-medium text-gray-800">{item.title}</div>
                                    <div className="mt-1 text-xs text-gray-500">
                                      {item.boardType} • {item.stateName}
                                    </div>
                                  </div>
                                  <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                    P{item.priority || 0}
                                  </span>
                                </button>
                                {isAdmin && release.status === "DRAFT" ? (
                                  <button
                                    onClick={() => {
                                      void handleDetachItem(release.id, item.issueId);
                                    }}
                                    className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:border-red-200 hover:text-red-600"
                                  >
                                    Quitar
                                  </button>
                                ) : null}
                              </div>
                            ))}
                            {details.items.length === 0 && (
                              <div className="rounded-lg border border-dashed border-gray-200 px-3 py-5 text-center text-sm text-gray-500">
                                No tickets attached yet.
                              </div>
                            )}
                          </div>
                        </div>

                        {isAdmin && isEditing && (
                          <div className="rounded-xl border border-gray-200 p-3">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Attach tickets
                            </div>
                            <input
                              value={ticketSearch}
                              onChange={(e) => setTicketSearch(e.target.value)}
                              placeholder="Search tickets to attach"
                              className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            />
                            <div className="max-h-48 space-y-1 overflow-y-auto">
                              {filteredCandidates
                                .filter((ticket) => !details.items.some((item) => item.issueId === ticket.issueId))
                                .slice(0, 100)
                                .map((ticket) => (
                                <label
                                  key={ticket.issueId}
                                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedIssueIds.includes(ticket.issueId)}
                                    onChange={(e) => {
                                      setSelectedIssueIds((prev) =>
                                        e.target.checked
                                          ? [...prev, ticket.issueId]
                                          : prev.filter((id) => id !== ticket.issueId)
                                      );
                                    }}
                                  />
                                  <span className="text-xs font-semibold text-gray-400">
                                    {ticket.identifier}
                                  </span>
                                  <span className="flex-1 truncate">{ticket.title}</span>
                                </label>
                              ))}
                            </div>
                            <div className="mt-2 flex justify-end">
                              <button
                                onClick={() => {
                                  const targetAccounts =
                                    details.accounts.length > 0
                                      ? details.accounts.map((account) => account.id)
                                      : [accountId];
                                  void handleAttachItems(release.id, targetAccounts);
                                }}
                                className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                Attach selected
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            </div>
          );
        })}

        <div className="flex justify-center">
          <button
            onClick={() => {
              if (!nextCursor || loading) return;
              void loadTimeline(false, nextCursor);
            }}
            disabled={!nextCursor || loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : nextCursor ? "Load more" : "No more releases"}
          </button>
        </div>
      </div>

      {toast ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[60] w-[min(90vw,360px)]">
          <div
            className="pointer-events-auto relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 shadow-lg"
            onMouseEnter={() => {
              toastPausedRef.current = true;
            }}
            onMouseLeave={() => {
              toastPausedRef.current = false;
            }}
          >
            <div
              className="absolute inset-y-0 left-0 bg-emerald-100 transition-[width] duration-75 ease-linear"
              style={{ width: `${toastProgress}%` }}
            />
            <div className="relative flex items-start gap-2 px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="flex-1 text-sm text-gray-800">{toast.text}</p>
              <button
                onClick={() => setToast(null)}
                className="rounded-md p-1 text-gray-500 hover:bg-white/70 hover:text-gray-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
