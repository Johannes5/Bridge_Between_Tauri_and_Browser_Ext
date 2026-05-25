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
    className={`inline-flex items-center rounded-lg border border-[#1b1b1f] bg-[#101013] p-1 ${className}`}
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
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            selected
              ? "bg-[#232329] text-gray-100"
              : "text-gray-400 hover:bg-[#1a1a1f] hover:text-gray-200"
          }`}
        >
          <Icon className="w-3.5 h-3.5" aria-hidden={true} />
          <span>{label}</span>
        </button>
      );
    })}
  </div>
);
