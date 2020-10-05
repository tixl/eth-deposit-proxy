import { bytes } from "../core/Core"
import { inject } from "../core/System"
import Collector from "../contracts/Collector"
import Receiver from "../contracts/Receiver"
import Writer from "../data/Writer"
import EthersProvider from "../ethers/EthersProvider"
import Store from "../storage/Store"

export default class Watcher {
    constructor(key?: Bytes) {
        if (key?.length) this._key = key
    }

    async start(): Promise<never> {
        let f = async (s: readonly [int, int]) => [s[1], await this._block()] as const
        for (let i = await f([0, 0]); true; i = await f(i)) if (i[0] != i[1]) await this.scan()
    }

    async add(key: Bytes): Promise<void> {
        if (!(await this._data.get(key)).length) await this._data.set(key, Buffer.from("0"))
    }

    async scan(): Promise<void> {
        for (let i = await this._data.range(); i; i = await i.next()) await this._scan(i.key, i.value)
    }

    private async _scan(key: Bytes, value: Bytes): Promise<void> {
        let k = Writer.packed([this._key, key])
        let t = await this._receiver.receive(k)
        let v = await this._provider.balance(t)
        if (`${v}` != "0") await this._collector.collect(k)
    }

    private async _block(): Promise<int> {
        return await this._provider["_provider"].getBlockNumber()
    }

    private _collector = inject(Collector)
    private _receiver = inject(Receiver)
    private _provider = inject(EthersProvider)
    private _data = inject(Store)
    private _key = bytes()
}

function _equal(a: Bytes, b: Bytes): boolean {
    if (a.length != b.length) return false
    let n = a.length
    for (let i = 0; i < n; i++) if (a[i] != b[i]) return false
    return true
}