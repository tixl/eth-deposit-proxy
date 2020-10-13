import { ethers, UnsignedTransaction } from "ethers"
import { Fund, Wallet, Signing, Signed, Key } from "../ethers/EthersTypes"
import EthersSigner from "./EthersSigner"
import EthersProvider from "../ethers/EthersProvider"

export default class EthersWallet implements Wallet {
    constructor(provider: EthersProvider, wallet: EthersSigner | string) {
        this._provider = provider
        let w = typeof wallet == "string" ? ethers.Wallet.fromMnemonic(wallet).connect(provider["_provider"]) : void 0
        let s = typeof wallet != "string" ? new _Signer(provider["_provider"], wallet) : void 0
        this._wallet = (w || s) as ethers.Signer
    }

    async send(amount: Natural, priority?: float): Promise<Fund> {
        throw 0
    }

    async addresses(afterAddress?: string): Promise<readonly string[]> {
        throw 0
    }

    async balance(address?: string): Promise<Natural> {
        throw 0
    }

    async receive(skipAddresses?: int): Promise<string> {
        throw 0
    }

    async sign(data: Signing.Signable): Promise<Signing.Signature> {
        throw 0
    }

    async key(signer: string): Promise<Key.Public> {
        throw 0
    }

    private _provider: EthersProvider
    private _wallet: ethers.Signer
}

class _Signer extends ethers.Signer {
    constructor(provider: ethers.providers.Provider, signer: EthersSigner) {
        super()
        this.provider = provider
        this._signer = signer
    }

    readonly provider: ethers.providers.Provider

    async getAddress(): Promise<string> {
        return ethers.utils.computeAddress(await this._signer.key())
    }

    async signMessage(message: Bytes): Promise<string> {
        return ethers.utils.hexlify(await this._signer.sign(message as Signing.Signable))
    }

    async signTransaction(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<string> {
        let t = await ethers.utils.resolveProperties(transaction) as UnsignedTransaction
        if ((t as { from?: string }).from) delete (t as { from?: string }).from
        let m = ethers.utils.arrayify(ethers.utils.serializeTransaction(t))
        return ethers.utils.serializeTransaction(t, await this._signer.sign(m as Signing.Signable))
    }

    connect(provider: ethers.providers.Provider): ethers.Signer {
        return provider != this.provider ? new _Signer(provider, this._signer) : this
    }

    private _signer: EthersSigner
}