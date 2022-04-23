import React, { useContext, useEffect, useMemo, useRef } from "react"
import { useSelector } from "@xstate/react"
import { Connect2ICContext } from "../context"

const selectState = state => ({
  principal: state.context.principal,
  provider: state.context.provider,
  status: state.value.idle,
})

export const useConnect = (props = {}) => {
  // TODO: handle
  const {
    onConnect = () => {
    },
    onDisconnect = () => {
    },
  } = props
  const {
    connectService,
    action,
  } = useContext(Connect2ICContext)
  const { principal, provider, status } = useSelector(connectService, selectState)

  useEffect(() => {
    // TODO: Some other workaround? useSelector still has old state when action fires.
    if (action?.type === "onConnect" && provider) {
      onConnect({ provider })
    }
    if (action?.type === "onDisconnect") {
      onDisconnect()
    }
  }, [action, provider])

  return {
    principal,
    provider,
    isConnected: status === "connected",
    isConnecting: status === "connecting",
    isDisconnecting: status === "disconnecting",
    isIdle: status === "idle",
    status,
    connect: (provider) => {
      connectService.send({ type: "CONNECT", data: { provider } })
    },
    disconnect: () => {
      connectService.send({ type: "DISCONNECT" })
    },
  }
}
