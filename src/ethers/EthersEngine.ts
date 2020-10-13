import { bytes, is } from "../core/Core"
import { Input, Transaction, Output, Signed, Signing } from "./EthersTypes"
import { Big, Hex } from "./EthersTools"
import { ethers } from "ethers"

export default class EthersEngine {
    static transaction(data?: Bytes | Partial<Transaction>): Transaction {
        let t = {
            from: [{ from: "", value: Big.int(0) } as Input],
            to: [{ to: "", value: Big.int(0) } as Output],
            signable: [],
            signed: [],
            nonce: 0,
            gas: { limit: Big.int(0), price: Big.int(0) },
            data: "",
            chain: 0,
        } as const as Transaction
        if (is(data, Uint8Array)) {
            let p = ethers.utils.parseTransaction(data)
            let s = p.r ? Hex.decode(ethers.utils.joinSignature({ r: p.r, s: p.s, v: p.v })) : bytes()
            t = {
                from: [{ from: p.from ?? "", value: Big.int(p.value) } as Input],
                to: [{ to: p.to ?? "", value: Big.int(p.value) } as Output],
                signable: s.length ? [] : [data as Signing.Signable],
                signed: s.length ? [{ data, signatures: [s as Signing.Signature] } as Signed] : [],
                nonce: p.nonce,
                gas: { limit: Big.int(p.gasLimit), price: Big.int(p.gasPrice) },
                data: p.data,
                chain: p.chainId,
            }
        }
        if (!data) return t
        return { ...t, ...data }
    }

    static signables(transaction: Transaction): readonly [Signing.Signable] {
        return [ethers.utils.arrayify(ethers.utils.serializeTransaction({
            to: transaction.to[0].to,
            value: ethers.BigNumber.from(`${transaction.to[0].value}`),
            nonce: transaction.nonce,
            gasLimit: ethers.BigNumber.from(`${transaction.gas.limit}`),
            gasPrice: ethers.BigNumber.from(`${transaction.gas.price}`),
            data: transaction.data,
            chainId: transaction.chain,
        }, transaction.signed.length ? transaction.signed[0].signatures[0] : void 0)) as Signing.Signable]
    }

    static sign(transaction: Transaction, signed: readonly [Signed]): Transaction {
        return { ...transaction, signable: [], signed }
    }

    static verify(transaction: Transaction): boolean {
        if (Big.compare(transaction.from[0].value, transaction.to[0].value) || !transaction.signed.length) return false
        let t = this.signables(transaction)[0]
        let s = transaction.signed[0].signatures[0]
        return ethers.utils.verifyMessage(t, s) == transaction.from[0].from // TODO: fix
    }
}