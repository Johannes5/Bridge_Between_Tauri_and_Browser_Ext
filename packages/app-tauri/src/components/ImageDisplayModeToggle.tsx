import * as React from "react";
import { ImageIcon } from "lucide-react";

export type ImageDisplayMode = "none" | "small" | "large";

interface ImageDisplayModeToggleProps {
  value: ImageDisplayMode;
  onChange: (mode: ImageDisplayMode) => void;
  className?: string;
}

const DISPLAY_MODES: Array<{ value: ImageDisplayMode; label: string }> = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "large", label: "Large" }
];

export const ImageDisplayModeToggle: React.FC<ImageDisplayModeToggleProps> = ({
  value,
  onChange,
  className = ""
}) => (
  <div
    className={`inline-flex items-center rounded-lg border border-[#1b1b1f] bg-[#101013] p-1 ${className}`}
    aria-label="Image display mode"
  >
    <span className="px-2 text-gray-500" aria-hidden="true">
      <ImageIcon className="w-3.5 h-3.5" />
    </span>
    {DISPLAY_MODES.map((mode) => {
      const selected = value === mode.value;
      return (
        <button
          key={mode.value}
          type="button"
          onClick={() => onChange(mode.value)}
          aria-pressed={selected}
          className={`inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            selected
              ? "bg-[#232329] text-gray-100"
              : "text-gray-400 hover:bg-[#1a1a1f] hover:text-gray-200"
          }`}
        >
          <span>{mode.label}</span>
        </button>
      );
    })}
  </div>
);
