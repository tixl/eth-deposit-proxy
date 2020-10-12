import { bytes } from "../core/Core"
import { inject } from "../core/System"
import { ethers } from "ethers"
import { Signing, Transaction } from "../ethers/EthersTypes"
import EthersProvider from "../ethers/EthersProvider"
import { Big } from "../ethers/EthersTools"

export default class Collector {
    constructor(key: Bytes, address: string) {
        this.address = address
        this._key = key
    }

    readonly address: string

    async sign(context: Bytes, transaction: Transaction): Promise<Transaction> {
        if (!transaction.signable.length) return transaction
        let m = ethers.utils.serializeTransaction({
            to: transaction.to[0].to,
            value: ethers.BigNumber.from(`${transaction.to[0].value}`),
            data: transaction.data,
            nonce: transaction.nonce,
            gasLimit: ethers.BigNumber.from(`${transaction.gas.limit}`),
            gasPrice: ethers.BigNumber.from(`${transaction.gas.price}`),
            chainId: transaction.chain,
        })
        let k = new ethers.utils.SigningKey(this._derive(context))
        let s = ethers.utils.arrayify(ethers.utils.joinSignature(k.signDigest(ethers.utils.keccak256(m))))
        return { ...transaction, signed: [{
            data: transaction.signable[0],
            signatures: [s as Signing.Signature] }],
        }
    }

    async transaction(context: Bytes): Promise<Transaction | void> {
        let k = this._derive(context)
        let a = ethers.utils.computeAddress(k)
        let g = await this._provider["_provider"].estimateGas({})
        let p = await this._provider["_provider"].getGasPrice()
        let m = ethers.utils.serializeTransaction({
            to: this.address,
            value: ethers.BigNumber.from(`${await this._provider.balance(a)}`).sub(g.mul(p)),
            nonce: await this._provider["_provider"].getTransactionCount(a),
            gasLimit: g,
            gasPrice: p,
            chainId: (await this._provider["_provider"].getNetwork()).chainId,
        })
        let t = ethers.utils.parseTransaction(m)
        if (t.value.isNegative() || t.value.isZero()) return
        return {
            from: [{
                from: a,
                value: Big.int(t.value),
            }],
            to: [{
                to: this.address,
                value: Big.int(t.value),
            }],
            signable: [ethers.utils.arrayify(m) as Signing.Signable],
            signed: [],
            nonce: t.nonce,
            data: "",
            gas: { limit: Big.int(t.gasLimit), price: Big.int(t.gasPrice) },
            chain: t.chainId,
        }
    }

    async collect(context: Bytes): Promise<void> {
        let t = await this.transaction(context)
        if (!t) return
        let s = await this.sign(context, t)
        await this._provider.send(s)
    }

    private _derive(context: Bytes): Bytes {
        return ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.concat([context, this._key])))
    }

    private _provider = inject(EthersProvider)
    private _key = bytes()
}