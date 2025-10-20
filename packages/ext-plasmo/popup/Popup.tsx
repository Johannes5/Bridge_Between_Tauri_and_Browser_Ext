import AccountStatusContainer from "~/components/AccountStatusContainer";
import ShortsLimits from "~/components/custom/limits/ShortsLimits"
import Stops from "~/components/custom/limits/Stops"
import UrlLimits from "~/components/custom/limits/UrlLimits"
import InfoButton from "~/components/InfoButton"
import PlasmicExtensionPopup from "~/components/plasmic/short_stop/PlasmicExtensionPopup"
import ProProAccountSection from "~/components/ProProAccountSection"
import {
  mdLIMIT_INFO_BUTTON_TOOLTIP,
  mdSTOPS_INFO_BUTTON_TOOLTIP
} from "~/constants/md.constants"
import useAdvancedOptions from "~/hooks/use-advanced-options"
import useLimits from "~/hooks/use-limits"
import { usePopup } from "~/hooks/use-popup"
import {
  ILimit,
  IShortsLimit,
  IStopsLimit,
  IUrlLimit
} from "~/types/limits.types"
import $messaging from "~/utils/messaging/index.utils"
import { $storage } from "~/utils/storage/index.utils"

function Popup() {
  const {
    userLoggedIn,
    checkingLoginStatus,
    showAdvancedOptions,
    setShowAdvancedOptions,
    loadingLogin,
    loginError,
    handleClickConnectionButton
  } = usePopup()

  const {
    urlLimits,
    shortsLimits,
    stops,
    handleCreateLimit,
    handleUpdateLimit,
    handleDeleteLimit,
    loading
  } = useLimits()

  const {
    advancedOptions,
    setAdvancedOptions,
    loading: loadingAdvancedOptions
  } = useAdvancedOptions()

  // console.log({
  //   loading,
  //   loadingAdvancedOptions
  // })

  return (
    <PlasmicExtensionPopup
      className="[&::-webkit-scrollbar]:w-[8px] [&::-webkit-scrollbar]:h-[8px] [&::-webkit-scrollbar-track]:bg-[#f00] [&::-webkit-scrollbar-track]:rounded-[4px] [&::-webkit-scrollbar-thumb]:bg-[#f00] [&::-webkit-scrollbar-thumb]:rounded-[4px] [&::-webkit-scrollbar-thumb]:transition-[background_0.2s_ease] [&::-webkit-scrollbar-thumb:hover]:bg-[#666] [&::-webkit-scrollbar-corner]:bg-[#f1f1f1] [scrollbar-width:thin] [scrollbar-color:_#888_#f1f1f1]"
      isLoading={loading || loadingAdvancedOptions}
      isConnectedToProPro={userLoggedIn}
      // showCustomizePopupButton={!isPopupActive()}
      style={{ width: "100%", height: "100%", minWidth: "540px" }}
      shortLimits={
        <ShortsLimits
          shortsLimits={shortsLimits as ILimit<IShortsLimit>[]}
          handleCreateLimit={handleCreateLimit}
          handleUpdateLimit={handleUpdateLimit}
          handleDeleteLimit={handleDeleteLimit}
        />
      }
      urlLimits={
        <UrlLimits
          urlLimits={urlLimits as ILimit<IUrlLimit>[]}
          handleCreateLimit={handleCreateLimit}
          handleUpdateLimit={handleUpdateLimit}
          handleDeleteLimit={handleDeleteLimit}
        />
      }
      stops={
        <Stops
          stops={stops as ILimit<IStopsLimit>[]}
          handleCreateLimit={handleCreateLimit}
          handleUpdateLimit={handleUpdateLimit}
          handleDeleteLimit={handleDeleteLimit}
        />
      }
      proProAccountSection={
        !userLoggedIn ? (
          <ProProAccountSection
            checkingLoginStatus={checkingLoginStatus}
            handleClickConnectionButton={handleClickConnectionButton}
            error={loginError}
            loading={loadingLogin}
          />
        ) : null
      }
      accountStatusContainer={<AccountStatusContainer />}
      limitsInfoButtonSlot={
        <InfoButton tooltipText={mdLIMIT_INFO_BUTTON_TOOLTIP} />
      }
      stopsInfoButtonSlot={
        <InfoButton tooltipText={mdSTOPS_INFO_BUTTON_TOOLTIP} />
      }
      showAdvancedOptionsButton={{
        onClick: () => {
          window.scrollTo(0, 0)
          setShowAdvancedOptions((prev) => !prev)
        }
      }}
      isShowingAdvancedOptions={showAdvancedOptions}
      isShowingAllAdvancedOptions={showAdvancedOptions}
      advancedOptions={{
        advancedOptions,
        setAdvancedOptions,
        backButton: {
          onClick: () => {
            window.scrollTo(0, 0)
            setShowAdvancedOptions((prev) => !prev)
          }
        },
        onCustomizePopupButtonClicked: async () => {
          $messaging.updatePopupState({
            showPopup: true,
            popupType: "customize_popup_mode"
          })
          $storage.misc.set("customizePopupMode", true)
        }
      }}
    />
  )
}

export default Popup