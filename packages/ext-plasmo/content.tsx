import logoPath from "data-base64:~assets/img/shortstopLogoWithText.png"
import stylesCSS from "data-text:~assets/styles/styles.css"
import type { PlasmoCSConfig } from "plasmo"

import LimitPopup from "~/components/LimitPopup"
import useContentScripts from "~/hooks/use-content-scripts"
import useShortcuts from "~/hooks/use-shortcuts"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start"
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = stylesCSS
  return style
}

const Logo = <img src={logoPath} alt="ShortStop Logo" className="w-full" />

export default function Content() {
  const { popupState, setPopupState, handleClickUnderlay } = useContentScripts()
  useShortcuts()

  if (!popupState.showPopup) return null

  return (
    <div
      id="modal-shortstop-blocker"
      className="fixed top-0 left-0 w-screen h-screen z-[99999] flex justify-center items-center overflow-hidden isolate bg-black/60 backdrop-blur-[40px]"
      onClick={(e) => {
        // TODO: Review this function and make it compatible with the new structure.
        handleClickUnderlay(e as unknown as Event)
      }}>
      <LimitPopup
        logo={Logo}
        limit={popupState.limit}
        popupState={popupState}
        setPopupState={setPopupState}
      />
    </div>
  )
}
