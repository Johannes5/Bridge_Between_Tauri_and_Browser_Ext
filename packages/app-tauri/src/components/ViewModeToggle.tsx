import * as React from "react";
import { LayoutGrid, List, type LucideIcon } from "lucide-react";

export type ViewMode = "list" | "grid";

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

const VIEW_MODES: Array<{
  value: ViewMode;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "list", label: "List", icon: List },
  { value: "grid", label: "Grid", icon: LayoutGrid }
];

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  value,
  onChange,
  className = ""
}) => (
  <div
    className={`inline-flex items-center rounded-xl border border-[#3a3a46] bg-[#17171d] p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)] ${className}`}
    aria-label="View mode"
  >
    {VIEW_MODES.map(({ value: mode, label, icon: Icon }) => {
      const selected = value === mode;
      return (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-pressed={selected}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            selected
              ? "bg-white text-black"
              : "text-gray-300 hover:bg-[#23232c] hover:text-gray-100"
          }`}
        >
          <Icon className="w-3.5 h-3.5" aria-hidden={true} />
          <span>{label}</span>
        </button>
      );
    })}
  </div>
);
