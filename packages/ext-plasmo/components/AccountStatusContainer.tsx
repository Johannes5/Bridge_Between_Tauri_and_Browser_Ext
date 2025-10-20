import { HTMLElementRefOf } from "@plasmicapp/react-web"
import * as React from "react"

import useAuthStatus from "~/hooks/use-auth-status"

import {
  DefaultAccountStatusContainerProps,
  PlasmicAccountStatusContainer
} from "./plasmic/short_stop/PlasmicAccountStatusContainer"

export interface AccountStatusContainerProps
  extends DefaultAccountStatusContainerProps {}

function AccountStatusContainer_(
  { ...props }: AccountStatusContainerProps,
  ref: HTMLElementRefOf<"div">
) {
  const {
    userLoggedIn,
    hasLoggedInBefore,
    loading,
    error,
    checkingLoginStatus,
    handleClickConnectionButton
  } = useAuthStatus()

  if (checkingLoginStatus) return null

  return (
    <>
      <PlasmicAccountStatusContainer
        root={{ ref }}
        stage={
          userLoggedIn
            ? "connectedAndOpen"
            : hasLoggedInBefore
              ? "loggedOutWarning"
              : "notConnected"
        }
        connectionButton={{
          disabled: loading,
          onClick: handleClickConnectionButton,
          children: loading
            ? "Loading..."
            : userLoggedIn
              ? "Log out"
              : "Connect"
        }}
        {...props}
      />
      {error && <div style={{ color: "red" }}>{error}</div>}
    </>
  )
}

const AccountStatusContainer = React.forwardRef(AccountStatusContainer_)
export default AccountStatusContainer
