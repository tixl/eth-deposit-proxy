import { assert, bytes, unsigned } from "../core/Core"
import { inject } from "../core/System"
import Collector from "./Collector"
import Receiver from "./Receiver"
import EthersProvider from "../ethers/EthersProvider"
import Store from "../storage/Store"
import Data from "../data/Data"
import { ethers } from "ethers"
import JSBI from "jsbi"
import { Transaction } from "../ethers/EthersTypes"

class Service {
    constructor(key: Bytes, address: string) {
        if (key?.length) this._key = key
        this._receiver = new Receiver(this._key)
        this._collector = new Collector(this._key, address)
    }

    readonly provider = inject(EthersProvider)

    get size(): int {
        return this._n
    }

    sign(context: Bytes, data: Bytes): Bytes {
        let t = new ethers.utils.SigningKey(ethers.utils.keccak256(ethers.utils.concat([context, this._key])))
        return ethers.utils.arrayify(ethers.utils.joinSignature(t.signDigest(ethers.utils.keccak256(data))))
    }

    receive(context: Bytes): string {
        return this._receiver.receive(context)
    }

    async at(index: int): Promise<Service.Record> {
        assert(unsigned(index) < this.size)
        let r = await this._data.get(Data.unsigned.encode(index))
        let t = Data.read(r, read => ({
            context: read(Data.bytes),
            block: read(Data.unsigned),
            balance: JSBI.BigInt(read(Data.string)),
            transaction: read(Data.string),
        } as const))
        return {
            index,
            context: t.context,
            address: this.receive(t.context),
            block: t.block,
            balance: t.balance,
            transaction: t.transaction,
        }
    }

    async index(address: string): Promise<int | void> {
        let t = await this._data.get(Data.string.encode(address))
        if (t.length) return Data.unsigned.decode(t).value
    }

    async update(): Promise<void> {
        let t = await this._data.get(bytes())
        await this.provider.update()
        if (!t.length) return
        this._n = Data.unsigned.decode(t).value
        for (let i = 0; i < this.size; i++) {
            let t = await this.at(i)
            let b = await this.provider.balance(t.address)
            if (!_compare(b, t.balance)) continue
            await this._update(i, { ...t, balance: b, block: this.provider.blocks - 1 })
        }
    }

    async add(context: Bytes): Promise<void> {
        for await (let i of this) if (_equals(i.context, context)) return
        await this._task.work(async () => await this._data.batch([
            [bytes(), Data.unsigned.encode(this.size + 1)],
            [Data.string.encode(this.receive(context)), Data.unsigned.encode(this.size)],
            [Data.unsigned.encode(this.size), Data.packed.encode([
                Data.bytes.encode(context),
                Data.unsigned.encode(),
                Data.string.encode("0"),
                Data.bytes.encode(),
            ])],
        ]))
        this._n++
    }

    async find(balance: Natural, confirmations: int): Promise<readonly Service.Record[]> {
        return await this._filter(balance, unsigned(confirmations), this.provider.blocks)
    }

    async collect(record: Service.Record): Promise<Transaction | void> {
        if (`${record.balance}` == "0") return
        let t = await this._collector.transaction(record.context)
        if (t) t = await this._collector.sign(record.context, t)
        let s = t ? t.signed[0] ? ethers.utils.arrayify(ethers.utils.keccak256(t.signed[0].data)) : bytes() : bytes()
        if (s) await this._update(record.index, { ...record, transaction: Buffer.from(s).toString("hex") })
        if (t) return t
    }

    async *[Symbol.asyncIterator](): AsyncIterator<Service.Record> {
        for (let i = 0; i < this.size; i++) yield await this.at(i)
    }

    private async _update(index: int, value: Service.Record): Promise<void> {
        await this._data.set(Data.unsigned.encode(index), Data.packed.encode([
            Data.bytes.encode(value.context),
            Data.unsigned.encode(value.block),
            Data.string.encode(`${value.balance}`),
            Data.string.encode(`${value.transaction}`),
        ]))
    }

    private async _filter(balance: Natural, confirmations: int, blocks: int): Promise<readonly Service.Record[]> {
        let t = [] as Service.Record[]
        for (let i = 0; i < this.size; i++) {
            let v = await this.at(i)
            if (_compare(v.balance, balance) >= 0 && blocks >= (v.block || blocks) + confirmations) t.push(v)
        }
        return t
    }

    private _collector: Collector
    private _receiver: Receiver
    private _data = inject(Store)
    private _task = new _Task
    private _key = bytes()
    private _n = 0
}

namespace Service {
    export interface Record {
        readonly index: int
        readonly context: Bytes
        readonly address: string
        readonly block: int
        readonly balance: Natural
        readonly transaction: string
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

function _compare(a: Natural, b: Natural): int {
    return JSBI.greaterThan(a, b) ? 1 : JSBI.lessThan(a, b) ? - 1 : 0
}

export default Service