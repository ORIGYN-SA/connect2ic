import React from "react"
import { metamaskLogo } from "@connect2ic/core"

const IIButton = ({ dark = false, ...props }) => {
  return (
    <button className="button-styles metamask-styles" {...props}>
      <img style={{ width: "55px" }} className={"img-styles"} src={metamaskLogo} />
      <div>
        <span className="button-label">Metamask</span>
        {/*<span>ConnectButton with your Metamask wallet</span>*/}
      </div>
    </button>
  )
}

export default IIButton