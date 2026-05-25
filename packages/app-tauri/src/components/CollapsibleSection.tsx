import * as React from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  defaultOpen = false,
  className = "",
  children,
}) => {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 py-2 text-left text-gray-100 hover:text-white transition-colors"
        aria-expanded={open}
      >
        <ChevronDown
          className={`w-6 h-6 shrink-0 text-gray-400 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
          aria-hidden="true"
        />
        <span className="text-2xl font-semibold tracking-tight">{title}</span>
      </button>
      {open && <div className="pt-3 pl-9 space-y-6">{children}</div>}
    </section>
  );
};
