import { ethers } from "ethers"
import { Signable, Signature, Transaction } from "../ethers/EthersTypes"
import JSBI from "jsbi"
import EthersProvider from "../ethers/EthersProvider"
import { inject } from "../core/System"
import { bytes } from "../core/Core"

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
            data: transaction.from[0].data,
            nonce: transaction.from[0].nonce,
            gasLimit: ethers.BigNumber.from(`${transaction.from[0].gasLimit}`),
            gasPrice: ethers.BigNumber.from(`${transaction.from[0].gasPrice}`),
            chainId: transaction.from[0].chain,
        })
        let k = new ethers.utils.SigningKey(this._derive(context))
        let t = ethers.utils.arrayify(ethers.utils.joinSignature(k.signDigest(ethers.utils.keccak256(m))))
        let s = {
            data: t,
            signer: { key: { type: "Public", data: ethers.utils.arrayify(k.compressedPublicKey) }, name: "" },
        } as Signature
        return { ...transaction, signed: [{ data: transaction.signable[0].data, signatures: [s] }] }
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
        let s = {
            data: ethers.utils.arrayify(m),
            signers: [""],
        } as Signable
        let t = ethers.utils.parseTransaction(m)
        if (t.value.isNegative() || t.value.isZero()) return
        return {
            from: [{
                from: a,
                value: JSBI.BigInt(`${t.value}`),
                data: "",
                nonce: t.nonce,
                gasLimit: JSBI.BigInt(`${t.gasLimit}`),
                gasPrice: JSBI.BigInt(`${t.gasPrice}`),
                chain: t.chainId,
            }],
            to: [{
                to: this.address,
                value: JSBI.BigInt(`${t.value}`),
            }],
            signable: [s],
            signed: [],
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