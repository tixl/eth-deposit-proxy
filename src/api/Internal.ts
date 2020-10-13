import { apply, assert, is, unsigned } from "../core/Core"
import { inject } from "../core/System"
import { Big, Hex } from "../ethers/EthersTools"
import Service from "./Service"

/** Internal API. */
export default class Internal {
    /** Start an endless loop of periodic updates. */
    start(interval: float, confirmations?: int): void {
        assert(interval >= 0)
        confirmations = unsigned(confirmations ?? 0)
        if (this._started) return
        this._started = true
        apply(async () => {
            while (true) {
                await _wait(interval)
                await this.update(confirmations)
            }
        })
    }

    /** Returns address corresponing to the context, without adding it to the database. */
    address(context: Bytes | string): string {
        if (is(context, String)) context = Hex.decode(context)
        return this._service.receive(context)
    }

    /** Update all records and collect sufficiently confirmed funds. */
    async update(confirmations?: int): Promise<void> {
        confirmations = unsigned(confirmations ?? 0)
        await this._service.update()
        for await (let i of this._service) if (Big.compare(i.balance, 0) && i.block) {
            let c = this._service.provider.blocks - i.block
            if (c < confirmations) continue
            let r = await this._service.collect(i)
            if (r) await this._service.provider.send(r)
        }
    }

    private _service = inject(Service)
    private _started = false
}

async function _wait(time: float): Promise<void> {
    let t = (time * 1000) | 0
    await new Promise((done: () => void): void => { setTimeout(() => { done() }, t) })
}