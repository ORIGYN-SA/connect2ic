import { ActorSubclass } from "@dfinity/agent"
import { Principal } from "@dfinity/principal"

import NFT_C3, { TokenDetails, TransferResponse } from "./interfaces"
import IDL from "./ccc.did"
import { NFTDetails } from "../interfaces/nft"
import { NFT as NFTStandard } from "../../tokens/constants/standards"
import { Account, NFTWrapper } from "../nft-interfaces"

export default class CCC implements NFTWrapper {
  standard = NFTStandard.c3

  actor: ActorSubclass<NFT_C3>
  canisterId: string

  constructor(actor: ActorSubclass<NFT_C3>, canisterId: string) {
    // super()
    this.actor = actor
    this.canisterId = canisterId
  }

  async mint(receiver: Account, metadata: any, tokenIndex: bigint) {
    // TODO:
    // const index = (tokenIndex || tokenIndex === 0n) ? tokenIndex : BigInt((await this.collectionDetails()).totalSupply)
    // const mintResult = await this.actor.mint(receiver.owner, index, metadata)
    // if ("Err" in mintResult) {
    //   console.error(mintResult.Err)
    // }
    // if ("Ok" in mintResult) {
    //   return mintResult
    // }
  }

  async getUserTokens(principal: Principal): Promise<NFTDetails[]> {
    const tokensIndexes = await this.actor.getAllNFT(principal)
    const tokensData = await Promise.all(
      tokensIndexes.map(async item => {
        const tokenIndex = item[0]
        const principal = item[1]
        const userTokensResult = await this.actor.getTokenById(tokenIndex)
        if ("err" in userTokensResult) throw new Error(Object.keys(userTokensResult.err)[0])
        return { detail: userTokensResult.ok, principal }
      }),
    )
    return tokensData.map(token => this.serializeTokenData(token.detail, token.principal))
  }

  async transfer({ to, from, tokenIndex }) {
    const transferResult: TransferResponse = await this.actor.transferFrom(from, to, BigInt(tokenIndex))
    if ("err" in transferResult) throw new Error(Object.keys(transferResult.err)[0])
  }

  async details(tokenIndex: number): Promise<NFTDetails> {
    const tokenData = await this.actor.getTokenById(BigInt(tokenIndex))
    if ("err" in tokenData) throw new Error(Object.keys(tokenData.err)[0])
    const prinId = await this.actor.getNftStoreCIDByIndex(BigInt(tokenIndex))
    if (!prinId) throw new Error("Error tokenIndex")
    return this.serializeTokenData(tokenData.ok, prinId)
  }

  private serializeTokenData = (tokenData: TokenDetails, prinId: Principal): NFTDetails => {
    return {
      index: BigInt(tokenData.id),
      canister: this.canisterId,
      url: `https://${prinId.toText()}.raw.ic0.app/token/${tokenData.id}`,
      name: `${tokenData.id}`,
      metadata: tokenData,
      standard: this.standard,
    }
  }
}
