"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import PortalHeader from "@/app/portal/_components/portal-header";
import PortalToolbar from "@/app/portal/_components/portal-toolbar";
import TicketTable from "@/app/portal/_components/ticket-table";
import KanbanBoard from "@/app/portal/_components/kanban-board";
import NewTicketModal from "@/app/portal/_components/new-ticket-modal";
import TicketDetailsDrawer from "@/app/portal/_components/ticket-details-drawer";
import { useBoardSelection } from "@/app/portal/_hooks/use-board-selection";
import { useBoardPreferences } from "@/app/portal/_hooks/use-board-preferences";
import { useBoardTickets } from "@/app/portal/_hooks/use-board-tickets";
import { useRecentActivity } from "@/app/portal/_hooks/use-recent-activity";
import { useTicketDetails } from "@/app/portal/_hooks/use-ticket-details";
import { useNewTicket } from "@/app/portal/_hooks/use-new-ticket";
import { comparePriority } from "@/app/portal/_utils/priority";
import { orderWorkflowStates } from "@/app/portal/_utils/state-order";
import type { SortRuleDto, TicketDto } from "@/lib/contracts/portal";

function compareTickets(a: TicketDto, b: TicketDto, rule: SortRuleDto): number {
  if (rule.field === "priority") {
    return comparePriority(a.priority, b.priority, rule.direction);
  }

  let va = "";
  let vb = "";

  if (rule.field === "createdAt") {
    va = a.createdAt || "";
    vb = b.createdAt || "";
  } else if (rule.field === "updatedAt") {
    va = a.updatedAt || "";
    vb = b.updatedAt || "";
  } else if (rule.field === "title") {
    va = a.title || "";
    vb = b.title || "";
  } else if (rule.field === "owner") {
    va = a.assigneeName || "";
    vb = b.assigneeName || "";
  } else if (rule.field === "state") {
    va = a.state || "";
    vb = b.state || "";
  }

  if (va < vb) return rule.direction === "asc" ? -1 : 1;
  if (va > vb) return rule.direction === "asc" ? 1 : -1;
  return 0;
}

export default function PortalView() {
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    portalType,
    setPortalType,
    selectedBoardId,
    selectedBoard,
    selectedAccountName,
    loadingBoards,
  } = useBoardSelection();

  const { view, sorts, updateBoardView, updateBoardSorts } = useBoardPreferences(selectedBoardId);
  const { tickets, states, loadingTickets, reload, invalidateBoardCache } = useBoardTickets(selectedBoardId);
  const {
    activityOpen,
    setActivityOpen,
    activity,
    activityLoading,
    unreadActivityIds,
    clearAll,
    removeActivityAndMarkSeen,
  } = useRecentActivity(selectedBoardId);
  const {
    detailsOpen,
    setDetailsOpen,
    detailsLoading,
    details,
    commentBody,
    setCommentBody,
    commentSubmitting,
    commentError,
    openDetails,
    submitComment,
  } = useTicketDetails();
  const {
    showNewTicket,
    setShowNewTicket,
    newTicket,
    setNewTicket,
    savingTicket,
    ticketError,
    submitNewTicket,
  } = useNewTicket();

  const [search, setSearch] = useState("");

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
    const sorted = [...filteredTickets];
    sorted.sort((a, b) => {
      for (const rule of sorts) {
        const result = compareTickets(a, b, rule);
        if (result !== 0) return result;
      }
      return 0;
    });
    return sorted;
  }, [filteredTickets, sorts]);

  const orderedStates = useMemo(() => orderWorkflowStates(states), [states]);

  const groupedTickets = useMemo(() => {
    const map = new Map<string, TicketDto[]>();
    orderedStates.forEach((state) => map.set(state.id, []));

    sortedTickets.forEach((ticket) => {
      const key = ticket.stateId || ticket.state;
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(ticket);
    });

    return map;
  }, [sortedTickets, orderedStates]);

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader
        selectedAccountName={selectedAccountName}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={setSelectedAccountId}
        portalType={portalType}
        onChangePortalType={setPortalType}
        activityOpen={activityOpen}
        onToggleActivity={() => setActivityOpen((prev) => !prev)}
        activityItems={activity}
        activityLoading={activityLoading}
        unreadActivityIds={unreadActivityIds}
        onReadAll={clearAll}
        onSelectActivityItem={(item) => {
          removeActivityAndMarkSeen(item.id);
          setActivityOpen(false);
          void openDetails(item.issueId);
        }}
      />

      <main className="mx-auto max-w-6xl px-6 py-6">
        <PortalToolbar
          selectedBoard={selectedBoard}
          search={search}
          onSearchChange={setSearch}
          view={view}
          onChangeView={updateBoardView}
          sorts={sorts}
          onChangeSorts={updateBoardSorts}
          onCreateTicket={() => {
            setShowNewTicket(true);
          }}
        />

        {loadingBoards || loadingTickets ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/70 py-24">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : view === "table" ? (
          <TicketTable tickets={sortedTickets} sorts={sorts} onOpenTicket={openDetails} />
        ) : (
          <KanbanBoard states={orderedStates} groupedTickets={groupedTickets} onOpenTicket={openDetails} />
        )}
      </main>

      <NewTicketModal
        open={showNewTicket}
        boardName={selectedBoard?.name}
        value={newTicket}
        onChange={setNewTicket}
        onClose={() => setShowNewTicket(false)}
        onSubmit={() =>
          submitNewTicket({
            selectedBoardId,
            selectedBoardType: selectedBoard?.type,
            onSuccess: async () => {
              if (!selectedBoardId) return;
              invalidateBoardCache(selectedBoardId);
              await reload();
            },
          })
        }
        saving={savingTicket}
        error={ticketError}
      />

      <TicketDetailsDrawer
        open={detailsOpen}
        loading={detailsLoading}
        details={details}
        commentBody={commentBody}
        onChangeCommentBody={setCommentBody}
        onClose={() => setDetailsOpen(false)}
        onSubmitComment={submitComment}
        commentSubmitting={commentSubmitting}
        commentError={commentError}
      />
    </div>
  );
}
