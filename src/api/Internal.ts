import { assert, unsigned } from "../core/Core"
import { inject } from "../core/System"
import { Big } from "../ethers/EthersTools"
import Service from "./Service"

/** Internal API. */
export default class Internal {
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

    /** Start an endless loop of periodic updates. */
    async start(interval: float, confirmations?: int): Promise<never> {
        assert(interval >= 0)
        confirmations = unsigned(confirmations ?? 0)
        while (true) {
            await _wait(interval)
            await this.update(confirmations)
        }
    }

    private _service = inject(Service)
}

async function _wait(time: float): Promise<void> {
    let t = (time * 1000) | 0
    await new Promise((done: () => void): void => { setTimeout(() => { done() }, t) })
}