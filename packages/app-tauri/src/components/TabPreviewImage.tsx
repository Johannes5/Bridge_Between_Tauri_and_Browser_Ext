import * as React from "react";
import { ImageOff } from "lucide-react";
import type { TabDescriptor } from "shared-proto";

interface TabPreviewImageProps {
  tab: TabDescriptor;
  className?: string;
  durationOverlayText?: string;
  hideWhenEmpty?: boolean;
}

export const TabPreviewImage: React.FC<TabPreviewImageProps> = ({
  tab,
  className = "",
  durationOverlayText,
  hideWhenEmpty = false
}) => {
  const src = tab.previewImageUrl?.trim();
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    if (hideWhenEmpty) {
      return null;
    }

    return (
      <div aria-hidden="true" className={`relative overflow-hidden rounded-md ${className}`}>
        <div className="flex h-full w-full items-center justify-center border border-[#222226] bg-[#17171a] text-gray-600">
          <ImageOff className="w-4 h-4" aria-hidden="true" />
        </div>
        {durationOverlayText && (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/70 px-3 py-1 text-[22px] font-medium leading-none text-white">
            {durationOverlayText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={`relative overflow-hidden rounded-md ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-full w-full border border-[#222226] bg-[#17171a] object-cover"
        onError={() => setFailed(true)}
      />
      {durationOverlayText && (
        <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/70 px-3 py-1 text-[22px] font-medium leading-none text-white">
          {durationOverlayText}
        </span>
      )}
    </div>
  );
};
