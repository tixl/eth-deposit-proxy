import { bytes } from "../core/Core"
import { inject } from "../core/System"
import { ethers } from "ethers"
import { Key, Signing, Transaction } from "../ethers/EthersTypes"
import { Big, Digest, Signer } from "../ethers/EthersTools"
import EthersEngine from "../ethers/EthersEngine"
import EthersProvider from "../ethers/EthersProvider"

export default class Collector {
    constructor(key: Bytes, address: string) {
        this.address = address
        this._key = key
    }

    readonly address: string

    sign(context: Bytes, transaction: Transaction): Transaction {
        if (!transaction.signable.length) return transaction
        let s = Signer.sign(Digest.from(transaction.signable[0]), this._derive(context) as Key.Private)
        return EthersEngine.sign(transaction, [{
            data: transaction.signable[0],
            signatures: [s as Signing.Signature],
        }])
    }

    async transaction(context: Bytes): Promise<Transaction | void> {
        let k = this._derive(context)
        let a = ethers.utils.computeAddress(k)
        let g = Big.multiply(this._provider.gas.limit, this._provider.gas.price)
        let v = Big.subtract(await this._provider.balance(a), g)
        let t = EthersEngine.transaction({
            from: [{ from: a, value: v }],
            to: [{ to: this.address, value: v }],
            nonce: await this._provider["_provider"].getTransactionCount(a),
            gas: this._provider.gas,
            data: "",
            chain: this._provider.chain,
        })
        return {
            ...t,
            signable: EthersEngine.signables(t),
        }
    }

    async collect(context: Bytes): Promise<string> {
        let t = await this.transaction(context)
        return t ? await this._provider.send(await this.sign(context, t)) : ""
    }

    private _derive(context: Bytes): Bytes {
        return Digest.from(context, this._key)
    }

    private _provider = inject(EthersProvider)
    private _key = bytes()
}