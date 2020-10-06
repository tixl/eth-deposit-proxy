import { assert, bytes, unsigned } from "../core/Core"
import { inject } from "../core/System"
import Collector from "../contracts/Collector"
import Receiver from "../contracts/Receiver"
import Writer from "../data/Writer"
import EthersProvider from "../ethers/EthersProvider"
import Store from "../storage/Store"
import Reader from "../data/Reader"
import { ethers } from "ethers"

export default class Service {
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
        return this._receiver.receive(Writer.packed([this._key, key]))
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

    async update(): Promise<void> {
        let t = await this._data.get(bytes())
        this._n = t.length ? Reader.unsigned(t).value : 0
        for (let i = 0; i < this.size; i++) {
            let t = await this._data.get(Writer.unsigned(i))
            let v = Reader.read(t, [bytes, unsigned, String] as const).value
            let a = this.receive(v[0])
            let b = await this.provider.balance(a)
            if (`${b}` != `${v[2]}`) {
                let t = [Writer.bytes(v[0]), Writer.unsigned(await this.provider.blocks()), Writer.string(`${b}`)]
                await this._data.set(Writer.unsigned(i), Writer.packed(t))
            }
        }
    }

    async add(key: Bytes): Promise<void> {
        for await (let i of this) if (_equals(i, key)) return
        await this._task.work(async () => await this._data.batch([
            [bytes(), Writer.unsigned(this.size + 1)],
            [Writer.unsigned(this.size), Writer.packed([Writer.bytes(key), Writer.unsigned(0), Writer.string("0")])],
        ]))
        this._n++
    }

    async *[Symbol.asyncIterator](): AsyncIterator<Bytes> {
        let n = await this.size
        for (let i = 0; i < n; i++) yield await this.at(i)
    }

    private async _update(): Promise<void> {
        let t = await this._data.get(bytes())
        this._n = t.length ? Reader.unsigned(t).value : 0
    }

    private _receiver = inject(Receiver)
    private _data = inject(Store)
    private _task = new _Task
    private _key = bytes()
    private _n = 0
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

interface _Update {
    readonly request: {
        readonly balance?: Natural
        readonly confirmations?: int
    }
    readonly response: readonly {
        readonly address: string
        readonly balance: Natural
        readonly confirmations: int
    }[]
}