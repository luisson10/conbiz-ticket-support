"use client";

type BoardTypeToggleProps = {
  value: "SUPPORT" | "PROJECT";
  onChange: (value: "SUPPORT" | "PROJECT") => void;
};

export default function BoardTypeToggle({ value, onChange }: BoardTypeToggleProps) {
  return (
    <div className="flex h-10 items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
      <button
        onClick={() => onChange("SUPPORT")}
        className={`h-8 rounded-lg px-4 text-sm font-semibold ${
          value === "SUPPORT" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Soporte
      </button>
      <button
        onClick={() => onChange("PROJECT")}
        className={`h-8 rounded-lg px-4 text-sm font-semibold ${
          value === "PROJECT" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Proyecto
      </button>
    </div>
  );
}
