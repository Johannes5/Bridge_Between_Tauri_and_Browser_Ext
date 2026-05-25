import * as React from "react";
import { formatDateStampLabel } from "../utils/dateGroups";

interface DateStampBadgeProps {
  timestamp: number;
}

export const DateStampBadge: React.FC<DateStampBadgeProps> = ({ timestamp }) => (
  <div className="inline-flex rounded-[24px] border-2 border-[#e34e4e] bg-[#181818] px-5 py-2 text-[20px] font-semibold tracking-tight text-gray-100 shadow-[0_0_0_2px_rgba(227,78,78,0.3),0_8px_18px_rgba(0,0,0,0.42)]">
    {formatDateStampLabel(timestamp)}
  </div>
);
