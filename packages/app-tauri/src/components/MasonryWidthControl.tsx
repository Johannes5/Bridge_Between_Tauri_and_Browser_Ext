import * as React from "react";
import { PanelsTopLeft } from "lucide-react";

interface MasonryWidthControlProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export const MasonryWidthControl: React.FC<MasonryWidthControlProps> = ({
  value,
  onChange,
  className = ""
}) => (
  <label
    className={`inline-flex items-center gap-3 rounded-lg border border-[#1b1b1f] bg-[#101013] px-3 py-2 text-xs text-gray-300 ${className}`}
  >
    <span className="inline-flex items-center gap-2 shrink-0">
      <PanelsTopLeft className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Column Width</span>
    </span>
    <input
      type="range"
      min={240}
      max={460}
      step={10}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-28 accent-gray-400"
      aria-label="Adjust masonry column width"
    />
    <span className="w-12 text-right font-mono text-gray-400">{value}px</span>
  </label>
);
