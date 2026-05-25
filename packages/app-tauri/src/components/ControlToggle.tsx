import * as React from "react";

interface ControlToggleProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export const ControlToggle: React.FC<ControlToggleProps> = ({
  label,
  enabled,
  onChange,
  className = "",
  disabled = false,
  title
}) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    aria-pressed={enabled}
    disabled={disabled}
    title={title}
    className={`inline-flex items-center rounded-lg border border-[#1b1b1f] bg-[#101013] px-3 py-2 text-xs font-medium transition-colors ${
      disabled
        ? "cursor-not-allowed border-[#1b1b1f] bg-[#101013] text-gray-600"
        : enabled
          ? "border-[#2a2a2e] bg-[#232329] text-gray-100"
          : "text-gray-400 hover:bg-[#1a1a1f] hover:text-gray-200"
    } ${className}`}
  >
    <span>{label}</span>
  </button>
);
