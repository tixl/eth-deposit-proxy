import { assert, bytes, unsigned } from "../core/Core"
import { inject } from "../core/System"
import Collector from "../contracts/Collector"
import Receiver from "../contracts/Receiver"
import Writer from "../data/Writer"
import EthersProvider from "../ethers/EthersProvider"
import Store from "../storage/Store"
import Reader from "../data/Reader"
import { ethers } from "ethers"
import JSBI from "jsbi"

class Service {
    constructor(key?: Bytes) {
        if (key?.length) this._key = key
    }

    readonly provider = inject(EthersProvider)

    get size(): int {
        return this._n
    }

    sign(key: Bytes, data: Bytes): Bytes {
        let t = new ethers.utils.SigningKey(ethers.utils.keccak256(ethers.utils.concat([key, this._key])))
        return ethers.utils.arrayify(ethers.utils.joinSignature(t.signDigest(ethers.utils.keccak256(data))))
    }

    receive(key: Bytes): string {
        return this._receiver.receive(Writer.pack([this._key, key]))
    }

    async at(index: int): Promise<Bytes> {
        assert(unsigned(index) < this.size)
        return Reader.bytes(await this._data.get(Writer.unsigned(index))).value
    }

    async index(key: Bytes): Promise<int> {
        for (let i = 0; i < this.size; i++) if (_equals(key, await this.at(i))) return i
        assert(false)
    }

    async key(address: string): Promise<Bytes> {
        for await (let i of this) if (this.receive(i) == address) return i
        assert(false)
    }

    async record(index: int): Promise<Service.Record> {
        assert(unsigned(index) < this.size)
        let t = Reader.read(await this._data.get(Writer.unsigned(index)), [bytes, unsigned, String] as const).value
        return {
            key: t[0],
            address: this.receive(t[0]),
            block: t[1],
            balance: JSBI.BigInt(t[2]),
        }
    }

    async update(): Promise<void> {
        let t = await this._data.get(bytes())
        this._n = t.length ? Reader.unsigned(t).value : 0
        for (let i = 0; i < this.size; i++) {
            let t = await this.record(i)
            let b = await this.provider.balance(t.address)
            if (`${b}` == `${t.balance}`) continue
            await this._update(i, { ...t, balance: b, block: await this.provider.blocks() - 1 })
        }
    }

    async add(key: Bytes): Promise<void> {
        for await (let i of this) if (_equals(i, key)) return
        await this._task.work(async () => await this._data.batch([
            [bytes(), Writer.unsigned(this.size + 1)],
            [Writer.unsigned(this.size), Writer.pack([Writer.bytes(key), Writer.unsigned(0), Writer.string("0")])],
        ]))
        this._n++
    }

    async find(balance: Natural, confirmations: int): Promise<readonly Service.Record[]> {
        return await this._filter(`${balance}`, unsigned(confirmations), await this.provider.blocks())
    }

    async *[Symbol.asyncIterator](): AsyncIterator<Bytes> {
        for (let i = 0; i < this.size; i++) yield await this.at(i)
    }

    private async _update(index: int, value: Service.Record): Promise<void> {
        let t = [Writer.bytes(value.key), Writer.unsigned(value.block), Writer.string(`${value.balance}`)]
        await this._data.set(Writer.unsigned(index), Writer.pack(t))
    }

    private async _filter(balance: string, confirmations: int, blocks: int): Promise<readonly Service.Record[]> {
        let t = [] as Service.Record[]
        for (let i = 0; i < this.size; i++) {
            let v = await this.record(i)
            if (`${v.balance}` >= balance && blocks >= (v.block || blocks) + confirmations) t.push(v)
        }
        return t
    }

    private _receiver = inject(Receiver)
    private _data = inject(Store)
    private _task = new _Task
    private _key = bytes()
    private _n = 0
}

namespace Service {
    export interface Record {
        readonly key: Bytes
        readonly address: string
        readonly block: int
        readonly balance: Natural
    }
}

class _Task {
    get busy(): boolean {
        return Boolean(this._busy)
    }
    set busy(busy: boolean) {
        if (busy) this._work()
        if (!busy) this._rest()
    }

    async wait(): Promise<void> {
        if (this.busy) await this._busy
    }

    async work(work: () => Promise<void>): Promise<void> {
        await this.wait()
        this.busy = true
        await work()
        this.busy = false
    }

    private _work(): void {
        if (!this.busy) this._busy = new Promise((done: () => void): void => { this._done = done })
    }

    private _rest(): void {
        if (!this.busy) return
        if (this._done) this._done()
        this._done = void 0
        this._busy = void 0
    }

    private _done = void 0 as (() => void) | void
    private _busy = void 0 as Promise<void> | void
}

function _equals(a: Bytes, b: Bytes): boolean {
    if (a.length != b.length) return false
    let n = a.length
    for (let i = 0; i < n; i++) if (a[i] != b[i]) return false
    return true
}

export default Service