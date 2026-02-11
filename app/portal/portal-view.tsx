"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Settings,
  Plus,
  LayoutGrid,
  List,
  ExternalLink,
  Loader2,
  Calendar,
  User,
  MessageSquare,
  Paperclip,
  X,
  AlertTriangle,
  SignalHigh,
  SignalMedium,
  SignalLow,
  ArrowUp,
  ArrowDown,
  Bell,
} from "lucide-react";
import { getBoards, createBoard } from "@/app/actions/boards";
import {
  createIssueComment,
  getBoardTickets,
  getIssueDetails,
  getRecentActivity,
} from "@/app/actions/portal";
import { getTeams, getProjects } from "@/app/actions/linear";
import { createTicket } from "@/app/actions/tickets";

type Board = {
  id: string;
  name: string;
  teamId: string;
  projectId?: string | null;
};

type Ticket = {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  url?: string | null;
  priority?: number | null;
  state: string;
  stateId?: string | null;
  stateType?: string | null;
  stateColor?: string | null;
  assigneeName?: string | null;
  projectName?: string | null;
};

type WorkflowState = {
  id: string;
  name: string;
  type: string;
  color: string;
};

export default function PortalView() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [loadingBoards, setLoadingBoards] = useState(true);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "kanban">("kanban");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" | "none" }>({
    key: "createdAt",
    dir: "none",
  });
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    title: 280,
    description: 360,
    owner: 180,
    state: 140,
    dueDate: 140,
    priority: 120,
  });
  const resizeState = useRef<{
    key: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activity, setActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [unreadActivityIds, setUnreadActivityIds] = useState<Set<string>>(new Set());

  const [boardForm, setBoardForm] = useState({
    name: "",
    teamId: "",
    projectId: "",
  });
  const [teamOptions, setTeamOptions] = useState<any[]>([]);
  const [projectOptions, setProjectOptions] = useState<any[]>([]);
  const [savingBoard, setSavingBoard] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);

  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    priority: "0",
  });
  const [savingTicket, setSavingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBoards() {
      setLoadingBoards(true);
      const res = await getBoards();
      if (res.success) {
        setBoards(res.data);
        if (res.data.length > 0) {
          setSelectedBoardId(res.data[0].id);
        }
      }
      setLoadingBoards(false);
    }
    loadBoards();
  }, []);

  useEffect(() => {
    if (!selectedBoardId) return;
    async function loadTickets() {
      setLoadingTickets(true);
      const res = await getBoardTickets(selectedBoardId);
      if (res.success) {
        setTickets(res.data.tickets);
        setStates(res.data.states);
      } else {
        setTickets([]);
        setStates([]);
      }
      setLoadingTickets(false);
    }
    loadTickets();
  }, [selectedBoardId]);

  useEffect(() => {
    if (!selectedBoardId || !activityOpen) return;
    async function loadActivity() {
      setActivityLoading(true);
      const res = await getRecentActivity(selectedBoardId);
      if (res.success) {
        setActivity(res.data);
        setUnreadActivityIds(new Set(res.data.map((item: any) => item.id)));
      }
      setActivityLoading(false);
    }
    loadActivity();
  }, [selectedBoardId, activityOpen]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((ticket) =>
      [ticket.title, ticket.description, ticket.identifier]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [tickets, search]);

  const sortedTickets = useMemo(() => {
    if (sort.dir === "none") return filteredTickets;
    const sorted = [...filteredTickets];
    const getValue = (ticket: any) => {
      switch (sort.key) {
        case "title":
          return ticket.title || "";
        case "description":
          return ticket.description || "";
        case "owner":
          return ticket.assigneeName || "";
        case "state":
          return ticket.state || "";
        case "dueDate":
          return ticket.dueDate || "";
        case "priority":
          return ticket.priority ?? 0;
        case "createdAt":
        default:
          return ticket.createdAt || "";
      }
    };
    sorted.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredTickets, sort]);

  const onSort = (key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      if (prev.dir === "desc") return { key, dir: "none" };
      return { key, dir: "asc" };
    });
  };

  const onResizeStart = (key: string, startX: number) => {
    resizeState.current = {
      key,
      startX,
      startWidth: columnWidths[key] || 160,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!resizeState.current) return;
      const { key, startX, startWidth } = resizeState.current;
      const delta = event.clientX - startX;
      setColumnWidths((prev) => ({
        ...prev,
        [key]: Math.max(120, startWidth + delta),
      }));
    };
    const onUp = () => {
      resizeState.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [columnWidths]);

  const groupedTickets = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    states.forEach((state) => map.set(state.id, []));
    filteredTickets.forEach((ticket) => {
      const key = ticket.stateId || ticket.state;
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(ticket);
    });
    return map;
  }, [filteredTickets, states]);

  async function openBoardSettings() {
    setShowBoardSettings(true);
    if (teamOptions.length === 0) {
      const res = await getTeams();
      if (res.success) {
        setTeamOptions(res.data);
        if (res.data.length > 0) {
          setBoardForm((prev) => ({ ...prev, teamId: res.data[0].id }));
        }
      }
    }
  }

  useEffect(() => {
    if (!boardForm.teamId) return;
    async function loadProjects() {
      const res = await getProjects(boardForm.teamId);
      if (res.success) {
        setProjectOptions(res.data);
      }
    }
    loadProjects();
  }, [boardForm.teamId]);

  async function handleCreateBoard() {
    if (!boardForm.name || !boardForm.teamId) {
      setBoardError("Board name and team are required.");
      return;
    }

    setSavingBoard(true);
    setBoardError(null);
    const res = await createBoard({
      name: boardForm.name,
      teamId: boardForm.teamId,
      projectId: boardForm.projectId || null,
    });
    if (res.success) {
      setBoards([res.data, ...boards]);
      setSelectedBoardId(res.data.id);
      setBoardForm({ name: "", teamId: boardForm.teamId, projectId: "" });
      setShowBoardSettings(false);
    } else {
      setBoardError(res.error || "Failed to create board.");
    }
    setSavingBoard(false);
  }

  async function handleCreateTicket() {
    if (!selectedBoardId || !newTicket.title || !newTicket.description) {
      setTicketError("Title and description are required.");
      return;
    }
    setSavingTicket(true);
    setTicketError(null);
    const res = await createTicket({
      boardId: selectedBoardId,
      title: newTicket.title,
      description: newTicket.description,
      priority: parseInt(newTicket.priority, 10),
    });
    if (res.success) {
      setShowNewTicket(false);
      setNewTicket({ title: "", description: "", priority: "0" });
      const reload = await getBoardTickets(selectedBoardId);
      if (reload.success) {
        setTickets(reload.data.tickets);
        setStates(reload.data.states);
      }
    } else {
      setTicketError(res.error || "Failed to create ticket.");
    }
    setSavingTicket(false);
  }

  async function openDetails(issueId: string) {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setCommentBody("");
    setCommentError(null);
    const res = await getIssueDetails(issueId);
    if (res.success) {
      setDetails(res.data);
    } else {
      setDetails(null);
    }
    setDetailsLoading(false);
  }

  async function handleCommentSubmit() {
    if (!details?.id) return;
    setCommentSubmitting(true);
    setCommentError(null);
    const res = await createIssueComment(details.id, commentBody);
    if (res.success) {
      const refreshed = await getIssueDetails(details.id);
      if (refreshed.success) {
        setDetails(refreshed.data);
      }
      setCommentBody("");
    } else {
      setCommentError(res.error || "Failed to post comment.");
    }
    setCommentSubmitting(false);
  }

  function renderMarkdown(markdown?: string | null) {
    if (!markdown) return "";
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const normalizeUrl = (value: string) => {
      let url = value.trim();
      url = url.replace(/^<|>$/g, "");
      if (url.startsWith("//")) return `https:${url}`;
      return url;
    };

    const proxyUploadsUrl = (value: string) => {
      try {
        const parsed = new URL(value);
        if (parsed.hostname === "uploads.linear.app") {
          return `/api/linear/file?url=${encodeURIComponent(parsed.toString())}`;
        }
      } catch {
        // ignore invalid URL
      }
      return value;
    };

    const inline = (value: string) => {
      const placeholders: { key: string; html: string }[] = [];
      let working = value;

      const addPlaceholder = (html: string) => {
        const key = `__MD_${placeholders.length}__`;
        placeholders.push({ key, html });
        return key;
      };

      working = working.replace(
        /!\[([^\]]*)\]\((\S+?)(?:\s+"[^"]*")?\)/g,
        (_, alt, url) => {
          const safeUrl = proxyUploadsUrl(normalizeUrl(url));
          return addPlaceholder(
            `<img src="${safeUrl}" alt="${alt || ""}" loading="lazy" />`
          );
        }
      );

      working = working.replace(
        /\[([^\]]+)\]\((\S+?)(?:\s+"[^"]*")?\)/g,
        (_, text, url) => {
          const safeUrl = normalizeUrl(url);
          return addPlaceholder(
            `<a href="${safeUrl}" target="_blank" rel="noreferrer">${text}</a>`
          );
        }
      );

      let escaped = escapeHtml(working);
      escaped = escaped
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");

      placeholders.forEach(({ key, html }) => {
        escaped = escaped.replace(key, html);
      });

      return escaped;
    };

    const lines = markdown.split(/\r?\n/);
    let html = "";
    let inList = false;

    const flushList = () => {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
    };

    for (const raw of lines) {
      const line = escapeHtml(raw);
      if (!line.trim()) {
        flushList();
        html += "<br />";
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushList();
        const level = headingMatch[1].length;
        html += `<h${level}>${inline(headingMatch[2])}</h${level}>`;
        continue;
      }

      const listMatch = line.match(/^(\*|-|\d+\.)\s+(.*)$/);
      if (listMatch) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += `<li>${inline(listMatch[2])}</li>`;
        continue;
      }

      flushList();
      html += `<p>${inline(raw)}</p>`;
    }

    flushList();

    return html;
  }

  function priorityBadge(priority?: number | null) {
    if (!priority || priority <= 0) {
      return { label: "No priority", icon: null };
    }
    if (priority === 1) return { label: "Urgent", icon: AlertTriangle };
    if (priority === 2) return { label: "High", icon: SignalHigh };
    if (priority === 3) return { label: "Medium", icon: SignalMedium };
    return { label: "Low", icon: SignalLow };
  }

  const selectedBoard = boards.find((b) => b.id === selectedBoardId);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <div className="flex items-center text-lg font-semibold text-gray-900">
            Soporte
          </div>

          <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets..."
              className="w-full bg-transparent text-sm text-gray-700 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
              {loadingBoards ? "Loading boards..." : selectedBoard?.name || "Select a board"}
            </div>
            <select
              value={selectedBoardId || ""}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm focus:outline-none"
            >
              <option value="" disabled>
                Select board
              </option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <div className="relative">
              <button
                onClick={() => setActivityOpen((prev) => !prev)}
                className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 shadow-sm transition hover:border-primary/40 hover:text-primary"
              >
                <span className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadActivityIds.size > 0 && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-sm bg-red-500" />
                  )}
                </span>
                Recent Activity
              </button>
              {activityOpen && (
                <div className="absolute right-0 top-11 w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-xl animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Recent Activity
                    </div>
                    <button
                      onClick={() => {
                        setActivity([]);
                        setUnreadActivityIds(new Set());
                      }}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-900"
                    >
                      Read all
                    </button>
                  </div>
                  {activityLoading ? (
                    <div className="mt-3 flex items-center justify-center text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : activity.length === 0 ? (
                    <div className="mt-3 text-sm text-gray-500">No recent updates.</div>
                  ) : (
                    <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                      {activity.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActivity((prev) => prev.filter((entry) => entry.id !== item.id));
                            setUnreadActivityIds((prev) => {
                              const next = new Set(prev);
                              next.delete(item.id);
                              return next;
                            });
                            setActivityOpen(false);
                            openDetails(item.issueId);
                          }}
                          className="w-full rounded-lg border border-gray-100 px-3 py-2 text-left text-sm text-gray-700 hover:border-primary/40"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
                            <span>{item.issueIdentifier}</span>
                            {unreadActivityIds.has(item.id) && (
                              <span className="h-2 w-2 rounded-sm bg-red-500" />
                            )}
                          </div>
                          <div className="font-medium text-gray-900">
                            {item.issueTitle}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.type === "comment" ? "New comment" : "Issue updated"}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowNewTicket(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Crear ticket
            </button>
            <button
              onClick={openBoardSettings}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-primary/40 hover:text-primary"
              title="Board settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {loadingTickets ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/70 py-24">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : view === "table" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                <button
                  onClick={() => setView("table")}
                  className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold ${
                    view === "table"
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  Tabla
                </button>
                <button
                  onClick={() => setView("kanban")}
                  className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold ${
                    view === "kanban"
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Kanban
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full table-fixed text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    {[
                      { key: "title", label: "Title" },
                    { key: "description", label: "Description" },
                    { key: "owner", label: "Owner" },
                    { key: "state", label: "State" },
                    { key: "dueDate", label: "Due date" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="relative px-5 py-3 font-medium select-none"
                        style={{ width: columnWidths[col.key] || undefined }}
                      >
                        <button
                          onClick={() => onSort(col.key)}
                          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          {col.label}
                          <span className="inline-flex items-center gap-0.5">
                            <ArrowUp
                              className={`h-3 w-3 ${
                                sort.key === col.key && sort.dir === "asc"
                                  ? "text-gray-900"
                                  : "text-gray-300"
                              }`}
                            />
                            <ArrowDown
                              className={`h-3 w-3 ${
                                sort.key === col.key && sort.dir === "desc"
                                  ? "text-gray-900"
                                  : "text-gray-300"
                              }`}
                            />
                          </span>
                        </button>
                        <span
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onResizeStart(col.key, e.clientX);
                          }}
                          className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                        >
                          <span className="absolute right-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded bg-gray-200" />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="cursor-pointer transition hover:bg-gray-50/70"
                      onClick={() => openDetails(ticket.id)}
                    >
                      <td className="px-5 py-4" style={{ width: columnWidths.title }}>
                        <div className="text-xs font-semibold text-gray-400">
                          {ticket.identifier}
                        </div>
                        <div className="font-semibold text-gray-900">{ticket.title}</div>
                      </td>
                      <td
                        className="px-5 py-4 text-gray-600"
                        style={{ width: columnWidths.description }}
                      >
                        <div className="line-clamp-2">{ticket.description || "—"}</div>
                      </td>
                      <td className="px-5 py-4 text-gray-600" style={{ width: columnWidths.owner }}>
                        <div className="flex flex-col gap-1">
                          <span>{ticket.assigneeName || "Unassigned"}</span>
                          {(() => {
                            const badge = priorityBadge(ticket.priority);
                            const Icon = badge.icon;
                            return (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-5 py-4" style={{ width: columnWidths.state }}>
                        <span
                          className="inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: `${ticket.stateColor}20`,
                            borderColor: `${ticket.stateColor}40`,
                            color: ticket.stateColor || "#4b5563",
                          }}
                        >
                          {ticket.state}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600" style={{ width: columnWidths.dueDate }}>
                        {ticket.dueDate
                          ? new Date(ticket.dueDate).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {sortedTickets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                      No tickets found for this board.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                <button
                  onClick={() => setView("table")}
                  className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold ${
                    view === "table"
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  Tabla
                </button>
                <button
                  onClick={() => setView("kanban")}
                  className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold ${
                    view === "kanban"
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Kanban
                </button>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
            {states.map((state) => (
              <div
                key={state.id}
                className="min-w-[260px] flex-1 rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: state.color }}
                    />
                    {state.name}
                  </div>
                  <span className="text-xs text-gray-400">
                    {groupedTickets.get(state.id)?.length || 0}
                  </span>
                </div>
                <div className="space-y-3">
                  {(groupedTickets.get(state.id) || []).map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => openDetails(ticket.id)}
                      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"
                    >
                      <div className="text-xs font-semibold text-gray-400">
                        {ticket.identifier}
                      </div>
                      <div className="mt-1 font-semibold text-gray-900">
                        {ticket.title}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <User className="h-3 w-3" />
                        {ticket.assigneeName || "Unassigned"}
                      </div>
                      {(() => {
                        const badge = priorityBadge(ticket.priority);
                        const Icon = badge.icon;
                        return (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                            {Icon ? <Icon className="h-3 w-3" /> : null}
                            {badge.label}
                          </div>
                        );
                      })()}
                      {ticket.dueDate && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {new Date(ticket.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </button>
                  ))}
                  {(groupedTickets.get(state.id) || []).length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white/60 px-3 py-6 text-center text-xs text-gray-400">
                      No requests
                    </div>
                  )}
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
      </main>

      {showBoardSettings && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 py-16 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Board settings</h2>
              <button
                onClick={() => setShowBoardSettings(false)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Create a new board by connecting it to a Linear team and project.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">Board name</label>
                <input
                  value={boardForm.name}
                  onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })}
                  placeholder="Vela Gas Support"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Team</label>
                <select
                  value={boardForm.teamId}
                  onChange={(e) =>
                    setBoardForm({ ...boardForm, teamId: e.target.value, projectId: "" })
                  }
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  {teamOptions.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Project</label>
                <select
                  value={boardForm.projectId}
                  onChange={(e) => setBoardForm({ ...boardForm, projectId: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">No project (team-wide)</option>
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              {boardError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {boardError}
                </div>
              )}
              <button
                onClick={handleCreateBoard}
                disabled={savingBoard}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {savingBoard ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create board
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewTicket && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 py-16 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Nuevo Ticket</h2>
              <button
                onClick={() => setShowNewTicket(false)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Create a new ticket for {selectedBoard?.name || "this board"}.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">Title</label>
                <input
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  placeholder="Brief summary"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, description: e.target.value })
                  }
                  rows={4}
                  placeholder="Add context, steps, and screenshots"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, priority: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="0">None</option>
                  <option value="1">Urgent</option>
                  <option value="2">High</option>
                  <option value="3">Normal</option>
                  <option value="4">Low</option>
                </select>
              </div>
              {ticketError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {ticketError}
                </div>
              )}
              <button
                onClick={handleCreateTicket}
                disabled={savingTicket}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {savingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 animate-fade-in">
          <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl animate-slide-in">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <div className="text-xs font-semibold text-gray-400">
                  {details?.identifier}
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {details?.title || "Ticket details"}
                </h2>
              </div>
              <button
                onClick={() => setDetailsOpen(false)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : details ? (
              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 text-sm text-gray-600">
                {(() => {
                  const rendered = renderMarkdown(details.description);
                  return (
                    <>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className="inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: `${details.stateColor}20`,
                            borderColor: `${details.stateColor}40`,
                            color: details.stateColor || "#4b5563",
                          }}
                        >
                          {details.state}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          {details.assigneeName}
                        </span>
                        {(() => {
                          const badge = priorityBadge(details.priority);
                          const Icon = badge.icon;
                          return (
                            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                              {Icon ? <Icon className="h-3 w-3" /> : null}
                              {badge.label}
                            </span>
                          );
                        })()}
                        {details.dueDate && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(details.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {details.url && (
                          <a
                            href={details.url}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            View in Linear <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Description
                        </h3>
                        <div
                          className="markdown-body mt-2 text-sm text-gray-700"
                          dangerouslySetInnerHTML={{
                            __html: rendered || "<p>No description provided.</p>",
                          }}
                        />
                      </div>
                    </>
                  );
                })()}

                <div>
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <MessageSquare className="h-3 w-3" />
                    Comments
                  </h3>
                  <div className="mt-3 space-y-3">
                    {details.comments.length === 0 && (
                      <p className="text-sm text-gray-400">No comments yet.</p>
                    )}
                    {details.comments.map((comment: any) => (
                      <div key={comment.id} className="rounded-lg border border-gray-100 p-3">
                        <div className="text-xs font-semibold text-gray-500">
                          {comment.userName} •{" "}
                          {new Date(comment.createdAt).toLocaleString()}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                          {comment.body}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      rows={3}
                      placeholder="Leave a reply (synced to Linear with #sync)"
                      className="w-full resize-none bg-transparent text-sm text-gray-700 outline-none"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      {commentError ? (
                        <span className="text-xs text-red-500">{commentError}</span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Only comments marked with #sync appear here.
                        </span>
                      )}
                      <button
                        onClick={handleCommentSubmit}
                        disabled={commentSubmitting}
                        className="rounded-md bg-gray-900 px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        {commentSubmitting ? "Posting..." : "Post comment"}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <Paperclip className="h-3 w-3" />
                    Attachments
                  </h3>
                  <div className="mt-3 space-y-2">
                    {details.attachments.length === 0 && (
                      <p className="text-sm text-gray-400">No attachments.</p>
                    )}
                    {details.attachments.map((file: any) => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-600 hover:border-primary/40"
                      >
                        <span>{file.title || "Attachment"}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-sm text-gray-500">Unable to load details.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
