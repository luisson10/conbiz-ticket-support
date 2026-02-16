"use client";

import { useState } from "react";
import { createTicket } from "@/app/actions/tickets";

type NewTicketForm = {
  title: string;
  description: string;
  priority: string;
};

export function useNewTicket() {
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState<NewTicketForm>({
    title: "",
    description: "",
    priority: "0",
  });
  const [savingTicket, setSavingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  async function submitNewTicket(options: {
    selectedBoardId: string | null;
    selectedBoardType?: "SUPPORT" | "PROJECT";
    onSuccess: () => Promise<void> | void;
  }) {
    if (options.selectedBoardType === "PROJECT") {
      setTicketError("Este portal de proyecto es solo lectura para crear tickets.");
      return;
    }

    if (!options.selectedBoardId || !newTicket.title || !newTicket.description) {
      setTicketError("Title and description are required.");
      return;
    }

    setSavingTicket(true);
    setTicketError(null);

    const res = await createTicket({
      boardId: options.selectedBoardId,
      title: newTicket.title,
      description: newTicket.description,
      priority: parseInt(newTicket.priority, 10),
    });

    if (res.success) {
      setShowNewTicket(false);
      setNewTicket({ title: "", description: "", priority: "0" });
      await options.onSuccess();
    } else {
      setTicketError(res.error || "Failed to create ticket.");
    }

    setSavingTicket(false);
  }

  return {
    showNewTicket,
    setShowNewTicket,
    newTicket,
    setNewTicket,
    savingTicket,
    ticketError,
    submitNewTicket,
  };
}
