"use client";

import { Paperclip, FileText, ImageIcon, Loader2, Upload, X } from "lucide-react";
import type { TicketAttachmentDraft } from "@/app/portal/_hooks/use-new-ticket";

type NewTicketForm = {
  title: string;
  description: string;
  category: string;
  attachments: TicketAttachmentDraft[];
};

type NewTicketModalProps = {
  open: boolean;
  boardName?: string;
  value: NewTicketForm;
  onChange: (value: NewTicketForm) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  error: string | null;
  categories: string[];
};

export default function NewTicketModal({
  open,
  boardName,
  value,
  onChange,
  onClose,
  onSubmit,
  saving,
  error,
  categories,
}: NewTicketModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8 animate-fade-in sm:py-16">
      <div className="w-[min(92vw,42rem)] shrink-0 rounded-2xl bg-white p-6 shadow-xl animate-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo Ticket</h2>
          <button onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">Crear un nuevo ticket para {boardName || "este tablero"}.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500">Título</label>
            <input
              value={value.title}
              onChange={(e) => onChange({ ...value, title: e.target.value })}
              placeholder="Resumen breve"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Descripción</label>
            <textarea
              value={value.description}
              onChange={(e) => onChange({ ...value, description: e.target.value })}
              rows={7}
              placeholder="Añade contexto, pasos e imágenes"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {categories.length > 0 ? (
            <div>
              <label className="text-xs font-semibold text-gray-500">Categoria</label>
              <select
                value={value.category}
                onChange={(e) => onChange({ ...value, category: e.target.value })}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">Selecciona categoria</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="text-xs font-semibold text-gray-500">Archivos</label>
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 hover:bg-gray-100">
              <Upload className="h-4 w-4" />
              Subir imagen o documento
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  if (files.length === 0) return;

                  const next = files.map((file) => ({
                    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    file,
                    previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
                  }));

                  onChange({ ...value, attachments: [...value.attachments, ...next] });
                  event.currentTarget.value = "";
                }}
              />
            </label>

            {value.attachments.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {value.attachments.map((attachment) => {
                  const isImage = attachment.file.type.startsWith("image/");
                  return (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100">
                        {isImage && attachment.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={attachment.previewUrl}
                            alt={attachment.file.name}
                            className="h-full w-full object-cover"
                          />
                        ) : attachment.file.type === "application/pdf" ? (
                          <FileText className="h-5 w-5 text-red-500" />
                        ) : (
                          <Paperclip className="h-5 w-5 text-gray-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-800">
                          {attachment.file.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(attachment.file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
                          onChange({
                            ...value,
                            attachments: value.attachments.filter((item) => item.id !== attachment.id),
                          });
                        }}
                        className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {value.attachments.length} archivo(s) seleccionado(s)
                </div>
              </div>
            ) : null}
          </div>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}

          <button
            onClick={onSubmit}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Crear ticket
          </button>
        </div>
      </div>
    </div>
  );
}
