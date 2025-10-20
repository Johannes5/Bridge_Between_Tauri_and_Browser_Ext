import ThemeContext from "~/components/plasmic/short_stop/PlasmicGlobalVariant__Theme"
import Popup from "~/popup/Popup"

import "~/assets/styles/styles.css"

export default function IndexPopup() {
  return (
    <ThemeContext.Provider value="dark">
      <div className="bg-[#221E1F]">
        <Popup />
      </div>
    </ThemeContext.Provider>
  )
}
