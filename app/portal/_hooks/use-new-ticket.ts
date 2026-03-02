"use client";

import { useState } from "react";
import { createTicket } from "@/app/actions/tickets";

export type TicketAttachmentDraft = {
  id: string;
  file: File;
  previewUrl?: string;
};

type NewTicketForm = {
  title: string;
  description: string;
  category: string;
  attachments: TicketAttachmentDraft[];
};

export function useNewTicket() {
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState<NewTicketForm>({
    title: "",
    description: "",
    category: "",
    attachments: [],
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
      setTicketError("Título y descripción son requeridos.");
      return;
    }

    setSavingTicket(true);
    setTicketError(null);

    const uploadedFiles: Array<{
      assetUrl: string;
      filename: string;
      contentType: string;
      size: number;
    }> = [];

    for (const attachment of newTicket.attachments) {
      const formData = new FormData();
      formData.append("file", attachment.file);

      const response = await fetch("/api/linear/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as
        | {
            success: true;
            data: { assetUrl: string; filename: string; contentType: string; size: number };
          }
        | { error?: string };

      if (!response.ok || !("success" in payload) || !payload.success) {
        setSavingTicket(false);
        setTicketError(payload.error || "No se pudo subir un archivo.");
        return;
      }

      uploadedFiles.push(payload.data);
    }

    const res = await createTicket({
      boardId: options.selectedBoardId,
      title: newTicket.title,
      description: newTicket.description,
      category: newTicket.category || null,
      attachments: uploadedFiles,
    });

    if (res.success) {
      setShowNewTicket(false);
      newTicket.attachments.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
      setNewTicket({ title: "", description: "", category: "", attachments: [] });
      await options.onSuccess();
    } else {
      setTicketError(res.error || "Error al crear el ticket.");
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
