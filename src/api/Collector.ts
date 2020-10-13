import { bytes } from "../core/Core"
import { inject } from "../core/System"
import { Transaction } from "../ethers/EthersTypes"
import { Big, Digest, Signer } from "../ethers/EthersTools"
import EthersEngine from "../ethers/EthersEngine"
import EthersProvider from "../ethers/EthersProvider"
import Receiver from "./Receiver"

/** Collecting money from address, sending it to fixed destination. */
export default class Collector {
    /** NOTE: The key must always be kept secret. Address is the destinatin where the money will be sent */
    constructor(key: Bytes, address: string) {
        this.address = address
        this._key = key
    }

    /** Destination address. */
    readonly address: string

    /** Sign transaction from address derived from context. */
    sign(context: Bytes, transaction: Transaction): Transaction {
        if (!transaction.signable.length) return transaction
        let s = Signer.sign(Digest.from(transaction.signable[0]), Receiver.derive(this._key, context))
        return EthersEngine.sign(transaction, [{
            data: transaction.signable[0],
            signatures: [s],
        }])
    }

    /** Create unsigned transaction from address derived from context to destination address, spending all balance. */
    async transaction(context: Bytes): Promise<Transaction | void> {
        let a = new Receiver(this._key).receive(context)
        let g = Big.multiply(this._provider.gas.limit, this._provider.gas.price)
        let v = Big.subtract(await this._provider.balance(a), g)
        let n = await this._provider.nonce(a)
        let t = EthersEngine.transaction({
            from: [{ from: a, value: v }],
            to: [{ to: this.address, value: v }],
            nonce: n,
            gas: this._provider.gas,
            data: "",
            chain: this._provider.chain,
        })
        return {
            ...t,
            signable: EthersEngine.signables(t),
        }
    }

    /** Creates, signs, and sends collection transaction. */
    async collect(context: Bytes): Promise<string> {
        let t = await this.transaction(context)
        return t ? await this._provider.send(await this.sign(context, t)) : ""
    }

    private _provider = inject(EthersProvider)
    private _key = bytes()
}