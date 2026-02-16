"use client";

import { Building2 } from "lucide-react";

type CreateOrganizationModalProps = {
  open: boolean;
  name: string;
  errorMessage: string | null;
  saving: boolean;
  onChangeName: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
};

export default function CreateOrganizationModal({
  open,
  name,
  errorMessage,
  saving,
  onChangeName,
  onClose,
  onCreate,
}: CreateOrganizationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 animate-fade-in">
      <div className="w-[min(92vw,32rem)] shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl animate-slide-up">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Crear organizacion</h3>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p className="text-sm text-gray-500">Ingresa un nombre unico para la nueva organizacion.</p>

          <div>
            <label className="block text-xs font-semibold text-gray-500">Nombre de organizacion</label>
            <input
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
              placeholder="Vela"
              autoFocus
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={onCreate}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              <Building2 className="h-3.5 w-3.5" />
              Crear organizacion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
