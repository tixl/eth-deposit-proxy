import { Input, Transaction, Output, Signable, Signed } from "./EthersTypes"
import { ethers } from "ethers"
import JSBI from "jsbi"

export default class EthersEngine {
    static transaction(from: readonly [Input], to: readonly [Output]): Transaction {
        return { from, to, signable: [], signed: [] }
    }

    static signables(transaction: Transaction): readonly [Signable] {
        return [{
            data: _serialize(transaction),
            signers: [transaction.from[0].from],
        }]
    }

    static sign(transaction: Transaction, signed: readonly [Signed]): Transaction {
        return {
            from: transaction.from,
            to: transaction.to,
            signable: [],
            signed: [signed[0]],
        }
    }

    static verify(transaction: Transaction): boolean {
        if (!JSBI.equal(transaction.from[0].value, transaction.to[0].value) || !transaction.signed.length) return false
        let t = _serialize(transaction)
        let s = transaction.signed[0].signatures[0].data
        return ethers.utils.verifyMessage(t, s) == transaction.from[0].from
    }
}

function _serialize(transaction: Transaction): Bytes {
    return ethers.utils.arrayify(ethers.utils.serializeTransaction({
        to: transaction.to[0].to,
        value: ethers.BigNumber.from(`${transaction.to[0].value}`),
        nonce: transaction.from[0].nonce,
        gasLimit: ethers.BigNumber.from(`${transaction.from[0].gasLimit}`),
        gasPrice: ethers.BigNumber.from(`${transaction.from[0].gasPrice}`),
        data: transaction.from[0].data,
        chainId: transaction.from[0].chain,
    }, transaction.signed.length ? transaction.signed[0].signatures[0].data : void 0))
}