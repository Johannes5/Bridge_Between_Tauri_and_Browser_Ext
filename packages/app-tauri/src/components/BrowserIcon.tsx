import * as React from "react";
import { Globe } from "lucide-react";
import chromeLogo from "../assets/chrome.svg";
import cometLogo from "../assets/comet.svg";

const isCometBrowser = (browser: string): boolean => {
  const b = browser.toLowerCase();
  return b.includes("comet") || b.includes("perplexity");
};

const isChromeBrowser = (browser: string): boolean => {
  const b = browser.toLowerCase();
  return b.includes("chrome") && !isCometBrowser(browser);
};

interface BrowserIconProps {
  browser: string;
  className?: string;
}

export const BrowserIcon: React.FC<BrowserIconProps> = ({
  browser,
  className = "w-4 h-4",
}) => {
  if (isCometBrowser(browser)) {
    return (
      <img
        src={cometLogo}
        alt=""
        className={`${className} rounded-full shrink-0`}
        aria-hidden="true"
      />
    );
  }

  if (isChromeBrowser(browser)) {
    return (
      <img
        src={chromeLogo}
        alt=""
        className={`${className} shrink-0`}
        aria-hidden="true"
      />
    );
  }

  return <Globe className={`${className} text-gray-400 shrink-0`} aria-hidden="true" />;
};
