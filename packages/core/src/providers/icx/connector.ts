import type { IDL } from "@dfinity/candid"
import type { ActorSubclass, Identity } from "@dfinity/agent"
import type { IConnector, IWalletConnector } from "../connectors"
import { AstroXWebViewHandler } from "@astrox/sdk-webview"
// @ts-ignore
import astroXLogoLight from "../../assets/astrox_light.svg"
// @ts-ignore
import astroXLogoDark from "../../assets/astrox.png"
import {
  ok,
  err, Result,
} from "neverthrow"
import {
  SignError,
  BalanceError,
  ConnectError,
  CreateActorError,
  DisconnectError,
  InitError,
  TransferError,
  TokensError,
  NFTsError,
} from "../connectors"
import { TransactionMessageKind, TransactionType } from "@astrox/sdk-webview/build/types"
import { DelegationMode } from "@astrox/sdk-webview/build/types"

class ICX implements IConnector, IWalletConnector {

  public meta = {
    features: ["wallet"],
    icon: {
      light: astroXLogoLight,
      dark: astroXLogoDark,
    },
    id: "icx",
    name: "ICX",
  }

  #config: {
    whitelist: Array<string>
    providerUrl: string
    ledgerCanisterId: string
    ledgerHost?: string
    host: string
    dev: boolean
    noUnify?: boolean
    delegationModes?: Array<DelegationMode>
  }
  #ic: AstroXWebViewHandler
  #principal?: string
  #supportedTokenList: Array<{
    symbol: string;
    standard: string;
    decimals: number;
    fee: string;
    name: string;
    canisterId: string;
  }> = []
  #wallet?: {
    principal: string;
    accountId: string;
  }

  get principal() {
    return this.#principal
  }

  get wallets() {
    return this.#wallet ? [this.#wallet] : []
  }

  constructor(userConfig = {}) {
    this.#config = {
      whitelist: [],
      providerUrl: "https://63k2f-nyaaa-aaaah-aakla-cai.raw.ic0.app",
      ledgerCanisterId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      ledgerHost: "https://boundary.ic0.app/",
      host: window.location.origin,
      dev: true,
      noUnify: false,
      ...userConfig,
    }
    this.#ic = new AstroXWebViewHandler()
    // // @ts-ignore
    // this.#ic = window.icx as AstroXWebViewHandler
  }

  set config(config) {
    this.#config = { ...this.#config, ...config }
  }

  get config() {
    return this.#config
  }

  async init() {
    try {
      await this.#ic.init()
      // @ts-ignore
      this.#supportedTokenList = await this.#ic.getSupportedTokenList()
      const isConnected = await this.isConnected()
      // TODO: never connected
      if (isConnected) {
        this.#principal = this.#ic.getPrincipal().toText()
        this.#wallet = this.#ic.wallet
        if (this.#config.dev) {
          await this.#ic.agent.fetchRootKey()
        }
      }
      return ok({ isConnected })
    } catch (e) {
      console.error(e)
      return err({ kind: InitError.InitFailed })
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      if (!this.#ic) {
        return false
      }
      const isConnected = await this.#ic.isConnected()
      // TODO: fix at astrox-js-sdk
      return !!isConnected
    } catch (e) {
      console.error(e)
      return false
    }
  }

  // TODO: export & use types from astrox/connection instead of dfinity/agent
  async createActor<Service>(canisterId: string, idlFactory: IDL.InterfaceFactory, config = {}): Promise<Result<ActorSubclass<Service>, { kind: CreateActorError; }>> {
    try {
      if (!this.#ic) {
        return err({ kind: CreateActorError.NotInitialized })
      }
      // @ts-ignore
      const actor = await this.#ic.createActor<Service>(canisterId, idlFactory)
      if (!actor) {
        return err({ kind: CreateActorError.CreateActorFailed })
      }
      // @ts-ignore
      return ok(actor)
    } catch (e) {
      console.error(e)
      return err({ kind: CreateActorError.CreateActorFailed })
    }
  }

  async connect() {
    try {
      if (!this.#ic) {
        return err({ kind: ConnectError.NotInitialized })
      }
      await this.#ic.connect({
        delegationModes: this.#config.delegationModes,
        delegationTargets: this.#config.whitelist,
        host: this.#config.host,
        noUnify: this.#config.noUnify,
      })
      this.#principal = this.#ic.getPrincipal().toText()
      this.#wallet = this.#ic.wallet
      if (this.#config.dev) {
        await this.#ic.agent.fetchRootKey()
      }
      return ok(true)
    } catch (e) {
      console.error(e)
      return err({ kind: ConnectError.ConnectFailed })
    }
  }

  async disconnect() {
    try {
      await this.#ic?.disconnect()
      return ok(true)
    } catch (e) {
      console.error(e)
      return err({ kind: DisconnectError.DisconnectFailed })
    }
  }

  async requestTransferNFT(args: {
    tokenIdentifier: string;
    tokenIndex: number;
    canisterId: string;
    to: string;
    standard: string;
    memo?: bigint | Array<number>
    fee?: number
    createdAtTime?: Date
    fromSubAccount?: number
  }) {
    try {
      const {
        tokenIdentifier,
        tokenIndex,
        canisterId,
        standard,
        to,
        fee = 0,
        memo = BigInt(0),
        createdAtTime = new Date(),
        fromSubAccount = 0,
      } = args
      if (!this.#ic) {
        return err({ kind: TransferError.NotInitialized })
      }
      const response = await this.#ic.requestTransfer({
        tokenIdentifier,
        tokenIndex,
        canisterId,
        standard,
        to,
        sendOpts: {
          fee: BigInt(fee),
          memo,
          from_subaccount: fromSubAccount,
          created_at_time: createdAtTime,
        },
      })
      if (response.kind === TransactionMessageKind.fail) {
        return err({ kind: TransferError.TransferFailed })
      }
      if (response.kind === TransactionMessageKind.success) {
        return ok({
          ...response.payload,
        })
      }
      return err({ kind: TransferError.TransferFailed })
    } catch (e) {
      console.error(e)
      return err({ kind: TransferError.TransferFailed })
    }
  }

  async requestTransfer(opts: {
    amount: number
    to: string
    symbol?: string
    standard?: string
    decimals?: number
    fee?: number
    memo?: bigint | Array<number>
    createdAtTime?: Date
    fromSubAccount?: number
  }) {
    const {
      to,
      amount,
      standard = "ICP",
      symbol = "ICP",
      decimals = 8,
      fee = 0,
      memo = BigInt(0),
      createdAtTime = new Date(),
      fromSubAccount = 0,
    } = opts
    try {
      const tokenInfo = this.#supportedTokenList.find(({
                                                         symbol: tokenSymbol,
                                                       }) => symbol === tokenSymbol)
      if (!tokenInfo) {
        return err({ kind: TransferError.TokenNotSupported })
      }
      // @ts-ignore
      const response = await this.#ic?.requestTransfer({
        //@ts-ignore
        amount: BigInt(amount * (10 ** tokenInfo.decimals)),
        to,
        symbol,
        standard,
        sendOpts: {
          fee: BigInt(fee),
          memo,
          from_subaccount: fromSubAccount,
          created_at_time: createdAtTime,
        },
      })
      if (!response || response.kind === TransactionMessageKind.fail) {
        // message?
        return err({ kind: TransferError.TransferFailed })
      }

      if (response.kind === TransactionMessageKind.success) {
        return ok({
          ...response.payload,
          height: response.payload.blockHeight ?? Number(response.payload.blockHeight),
        })
      }
      return err({ kind: TransferError.TransferFailed })
    } catch (e) {
      console.error(e)
      return err({ kind: TransferError.TransferFailed })
    }
  }

  async queryBalance() {
    try {
      if (!this.#ic) {
        return err({ kind: BalanceError.NotInitialized })
      }
      const response = await this.#ic.queryBalance()
      response.forEach(token => token.amount = token.amount / (10 ** token.decimals))
      return ok(response)
    } catch (e) {
      console.error(e)
      return err({ kind: BalanceError.QueryBalanceFailed })
    }
  }

  // async queryTokens() {
  //   try {
  //     if (!this.#ic) {
  //       return err({ kind: TokensError.NotInitialized })
  //     }
  //     const response = await this.#ic.queryBalance()
  //     return ok(response)
  //   } catch (e) {
  //     console.error(e)
  //     return err({ kind: TokensError.QueryBalanceFailed })
  //   }
  // }

  // async queryNFTs() {
  //   try {
  //     if (!this.#ic) {
  //       return err({ kind: NFTsError.NotInitialized })
  //     }
  //     // const response = await this.#ic.queryBalance()
  //     return ok(response)
  //   } catch (e) {
  //     console.error(e)
  //     return err({ kind: NFTsError.QueryBalanceFailed })
  //   }
  // }

  // TODO:
  // public async signMessage(message: string): Promise<any> => this.#ic.signMessage(message)
  // getManagementCanister: (...args) => this.#ic.getManagementCanister(...args),
  // batchTransactions: (...args) => this.#ic.batchTransactions(...args),
}

export {
  ICX,
}