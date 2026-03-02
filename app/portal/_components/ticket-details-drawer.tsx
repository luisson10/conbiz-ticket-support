"use client";

import {
  Calendar,
  ExternalLink,
  Loader2,
  MessageSquare,
  Paperclip,
  User,
  X,
} from "lucide-react";
import type { IssueDetailsDto } from "@/lib/contracts/portal";
import { priorityBadge } from "@/app/portal/_utils/priority";
import MarkdownContent from "@/app/portal/_utils/markdown";

type TicketDetailsDrawerProps = {
  canComment: boolean;
  open: boolean;
  loading: boolean;
  details: IssueDetailsDto | null;
  commentBody: string;
  onChangeCommentBody: (value: string) => void;
  onClose: () => void;
  onSubmitComment: () => void;
  commentSubmitting: boolean;
  commentError: string | null;
};

export default function TicketDetailsDrawer({
  canComment,
  open,
  loading,
  details,
  commentBody,
  onChangeCommentBody,
  onClose,
  onSubmitComment,
  commentSubmitting,
  commentError,
}: TicketDetailsDrawerProps) {
  if (!open) return null;
  const normalizedStateType = details?.stateType?.toLowerCase() || "";
  const normalizedStateName = details?.state?.toLowerCase() || "";
  const commentsDisabled =
    !canComment ||
    normalizedStateType === "canceled" ||
    normalizedStateType === "completed" ||
    normalizedStateType === "closed" ||
    normalizedStateName === "canceled" ||
    normalizedStateName === "closed";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 animate-fade-in">
      <div className="flex h-full w-[min(96vw,48rem)] min-w-[22rem] shrink-0 flex-col bg-white shadow-xl animate-slide-in">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <div className="text-xs font-semibold text-gray-400">{details?.identifier}</div>
            <h2 className="text-lg font-semibold text-gray-900">{details?.title || "Detalles del ticket"}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : details ? (
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 text-sm text-gray-600">
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
                  Ver en Linear <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Descripción</h3>
              <MarkdownContent value={details.description} />
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <MessageSquare className="h-3 w-3" />
                Comentarios
              </h3>

              <div className="mt-3 space-y-3">
                {details.comments.length === 0 && <p className="text-sm text-gray-400">Sin comentarios aún.</p>}
                {details.comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="text-xs font-semibold text-gray-500">
                      {comment.userName} • {new Date(comment.createdAt).toLocaleString()}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{comment.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <textarea
                  value={commentBody}
                  onChange={(e) => onChangeCommentBody(e.target.value)}
                  rows={3}
                  placeholder={
                    commentsDisabled
                      ? canComment
                        ? "Los comentarios están deshabilitados para tickets cerrados o cancelados."
                        : "Tu rol es viewer: comentarios deshabilitados."
                      : "Escribir comentario"
                  }
                  disabled={commentsDisabled}
                  className="w-full resize-none bg-transparent text-sm text-gray-700 outline-none disabled:cursor-not-allowed disabled:text-gray-400"
                />
                <div className="mt-2 flex items-center justify-end gap-3">
                  {commentsDisabled && (
                    <span className="mr-auto text-xs text-gray-500">
                      {canComment
                        ? "Este ticket está cerrado o cancelado. Los comentarios están deshabilitados."
                        : "Rol de espectador: los comentarios son solo de lectura."}
                    </span>
                  )}
                  {commentError && (
                    <span className="mr-auto text-xs text-red-500">{commentError}</span>
                  )}
                  <button
                    onClick={onSubmitComment}
                    disabled={commentSubmitting || commentsDisabled}
                    className="ml-auto shrink-0 rounded-md bg-gray-900 px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {commentSubmitting ? "Publicando..." : "Publicar comentario"}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <Paperclip className="h-3 w-3" />
                Archivos
              </h3>
              <div className="mt-3 space-y-2">
                {details.attachments.length === 0 && <p className="text-sm text-gray-400">Sin archivos.</p>}
                {details.attachments.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-600 hover:border-primary/40"
                  >
                    <span>{file.title || "Archivos"}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-sm text-gray-500">No se pudieron cargar los detalles.</div>
        )}
      </div>
    </div>
  );
}
