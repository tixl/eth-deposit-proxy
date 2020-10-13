import { is } from "../core/Core"
import { inject } from "../core/System"
import { Hex } from "../ethers/EthersTools"
import Service from "./Service"

/** Public API. */
export default class Public {
    /** Create (and return) an address given a context. The context is either bytes or hex string. */
    async create(context: Bytes | string): Promise<string> {
        if (is(context, String)) context = Hex.decode(context)
        if (!this._service.provider.blocks) await this._service.update()
        await this._service.add(context)
        return this._service.receive(context)
    }

    /** If the given address is tracked, returns Confirmation status and the collecting transaction (if exists). */
    async status(address: string): Promise<{ readonly confirmations: int, readonly transaction?: string } | void> {
        if (!this._service.provider.blocks) await this._service.update()
        let n = await this._service.index(address)
        if (!is(n)) return
        let r = await this._service.at(n)
        let c = r.block ? this._service.provider.blocks - r.block : 0
        return r.transaction ? { confirmations: c, transaction: r.transaction } : { confirmations: c }
    }

    private _service = inject(Service)
}