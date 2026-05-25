import * as React from "react";
import type { TabDescriptor } from "shared-proto";

interface TabVideoMetaProps {
  tab: TabDescriptor;
  className?: string;
  showChannelName?: boolean;
  showDuration?: boolean;
}

export const TabVideoMeta: React.FC<TabVideoMetaProps> = ({
  tab,
  className = "",
  showChannelName = true,
  showDuration = true
}) => {
  const channelName =
    showChannelName && typeof tab.channelName === "string" && tab.channelName.trim().length > 0
      ? tab.channelName
      : undefined;
  const videoDurationText =
    showDuration &&
    typeof tab.videoDurationText === "string" &&
    tab.videoDurationText.trim().length > 0
      ? tab.videoDurationText
      : undefined;

  if (!channelName && !videoDurationText) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 ${className}`}>
      {channelName && <span className="truncate">{channelName}</span>}
      {channelName && videoDurationText && <span>•</span>}
      {videoDurationText && <span className="truncate text-white">{videoDurationText}</span>}
    </div>
  );
};
