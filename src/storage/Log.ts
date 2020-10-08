import { assert, unsigned, bytes } from "../core/Core"
import Data from "../data/Data"
import Store from "./Store"

export default class Log {
    static async create(store: Store): Promise<Log> {
        let t = await store.get(bytes())
        return new Log(store, t.length ? Data.unsigned.decode(t).value : 0)
    }

    constructor(store: Store, size: int) {
        this._store = store
        this._size = unsigned(size)
    }

    get size(): int {
        return this._size
    }

    async at(index: int): Promise<Bytes> {
        assert(unsigned(index) < this.size)
        return await this._store.get(Data.unsigned.encode(index))
    }

    async add(value: Bytes): Promise<void> {
        await this._store.set(Data.unsigned.encode(this.size), value)
        let t = Data.unsigned.encode(this.size + 1)
        await this._store.set(t)
        this._size++
    }

    private _store: Store
    private _size: int
}