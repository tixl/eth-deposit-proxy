import { assert, bytes, unsigned } from "../core/Core"
import { inject } from "../core/System"
import Collector from "../contracts/Collector"
import Receiver from "../contracts/Receiver"
import EthersProvider from "../ethers/EthersProvider"
import Store from "../storage/Store"
import Data from "../data/Data"
import { ethers } from "ethers"
import JSBI from "jsbi"
import { Transaction } from "../ethers/EthersTypes"

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
        return this._receiver.receive(Data.packed.encode([this._key, key]))
    }

    async at(index: int): Promise<Service.Record> {
        assert(unsigned(index) < this.size)
        let r = await this._data.get(Data.unsigned.encode(index))
        let t = Data.read(r, read => ({
            key: read(Data.bytes),
            block: read(Data.unsigned),
            balance: JSBI.BigInt(read(Data.string)),
            transaction: read(Data.string),
        } as const))
        return {
            index,
            key: t[0],
            address: this.receive(t[0]),
            block: t[1],
            balance: JSBI.BigInt(t[2]),
            transaction: t[3],
        }
    }

    async index(address: string): Promise<int | void> {
        let t = await this._data.get(Data.string.encode(address))
        if (t.length) return Data.unsigned.decode(t).value
    }

    async update(): Promise<void> {
        let t = await this._data.get(bytes())
        this._n = t.length ? Data.unsigned.decode(t).value : 0
        for (let i = 0; i < this.size; i++) {
            let t = await this.at(i)
            let b = await this.provider.balance(t.address)
            if (`${b}` == `${t.balance}`) continue
            await this._update(i, { ...t, balance: b, block: await this.provider.blocks() - 1 })
        }
    }

    async add(key: Bytes): Promise<void> {
        for await (let i of this) if (_equals(i.key, key)) return
        await this._task.work(async () => await this._data.batch([
            [bytes(), Data.unsigned.encode(this.size + 1)],
            [Data.string.encode(this.receive(key)), Data.unsigned.encode(this.size)],
            [Data.unsigned.encode(this.size), Data.packed.encode([
                Data.bytes.encode(key),
                Data.unsigned.encode(),
                Data.string.encode("0"),
                Data.bytes.encode(),
            ])],
        ]))
        this._n++
    }

    async find(balance: Natural, confirmations: int): Promise<readonly Service.Record[]> {
        return await this._filter(`${balance}`, unsigned(confirmations), await this.provider.blocks())
    }

    async collect(record: Service.Record): Promise<Transaction | void> {
        let t = await this._collector.transaction(record.key)
        if (t) return await this._collector.sign(t)
    }

    async *[Symbol.asyncIterator](): AsyncIterator<Service.Record> {
        for (let i = 0; i < this.size; i++) yield await this.at(i)
    }

    private async _update(index: int, value: Service.Record): Promise<void> {
        await this._data.set(Data.unsigned.encode(index), Data.packed.encode([
            Data.bytes.encode(value.key),
            Data.unsigned.encode(value.block),
            Data.string.encode(`${value.balance}`),
            Data.string.encode(`${value.transaction}`),
        ]))
    }

    private async _filter(balance: string, confirmations: int, blocks: int): Promise<readonly Service.Record[]> {
        let t = [] as Service.Record[]
        for (let i = 0; i < this.size; i++) {
            let v = await this.at(i)
            if (`${v.balance}` >= balance && blocks >= (v.block || blocks) + confirmations) t.push(v)
        }
        return t
    }

    private _collector = inject(Collector)
    private _receiver = inject(Receiver)
    private _data = inject(Store)
    private _task = new _Task
    private _key = bytes()
    private _n = 0
}

namespace Service {
    export interface Record {
        readonly index: int
        readonly key: Bytes
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

export default Service