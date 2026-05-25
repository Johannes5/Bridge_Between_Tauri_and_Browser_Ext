import * as React from "react";
import { CalendarDays } from "lucide-react";

interface DateGroupingToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}

export const DateGroupingToggle: React.FC<DateGroupingToggleProps> = ({
  enabled,
  onChange,
  className = ""
}) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    aria-pressed={enabled}
    className={`inline-flex items-center gap-2 rounded-lg border border-[#1b1b1f] bg-[#101013] px-3 py-2 text-xs font-medium transition-colors ${
      enabled
        ? "border-[#2a2a2e] bg-[#232329] text-gray-100"
        : "text-gray-400 hover:bg-[#1a1a1f] hover:text-gray-200"
    } ${className}`}
  >
    <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
    <span>By Date</span>
  </button>
);
