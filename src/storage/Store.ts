import { bytes, is } from "../core/Core"

/** Database abstraction. The model required by the constructor provides the actual implementation. */
class Store {
    /** Create an iterator over a range of values. */
    static range(key: Bytes, value: Bytes, root?: Bytes, next?: _Next): Store.Range {
        return new _Range(key, value, root, next)
    }

    constructor(model: Store.Model) {
        this._model = model
    }

    /** Find a record mapped to the key. */
    async get(key: Bytes): Promise<Bytes> {
        return await this._model.get(this._key(key))
    }

    /** Update a record mapped to the key. */
    async set(key: Bytes, value?: Bytes): Promise<void> {
        await this._model.set(this._key(key), value || bytes())
    }

    /** Returns an iterable range of stored records. */
    async range(prefix?: Bytes): Promise<Store.Range> {
        return await this._model.range(this._key(prefix || bytes())) || _Empty.zero
    }

    /** Batch write. */
    async batch(items: readonly (Store.Entry | Bytes)[]): Promise<void> {
        let t = items.map(i => is(i, Uint8Array) ? [this._key(i), bytes()] as const : [this._key(i[0]), i[1]] as const)
        if (t.length) await this._model.batch(t)
    }

    /** Close this store. */
    async close(): Promise<void> {
        await this._model.close()
    }

    /** Create a new store with all keys having the `topic` prefix applied automatically. */
    topic(topic: Bytes): Store {
        if (!topic.length) return this
        let t = new Store(this._model)
        t._topic = this._topic.length ? bytes([...this._topic, ...topic]) : topic
        return t
    }

    private _key(key: Bytes): Bytes {
        if (!key.length) return this._topic
        return this._topic.length ? bytes([...this._topic, ...key]) : key
    }

    private _model: Store.Model
    private _topic = bytes()
}

namespace Store {
    export interface Model {
        get(key: Bytes): Promise<Bytes>
        set(key: Bytes, value: Bytes): Promise<void>
        range(prefix: Bytes): Promise<Store.Range | void>
        batch(items: readonly Entry[]): Promise<void>
        close(): Promise<void>
    }

    export type Range = AsyncIterable<Entry>
    export type Entry = readonly [Bytes, Bytes]
}

class _Range implements Store.Range {
    constructor(key: Bytes, value: Bytes, root?: Bytes, next?: _Next) {
        this.key = key
        this.value = value
        if (next) this._next = next
        if (root) this._root = root
    }

    readonly key: Bytes
    readonly value: Bytes

    async next(): Promise<Store.Range | void> {
        let t = this._next != _done ? await this._next() as _Range : void 0
        if (!t || !this._root.length) return t
        if (t.key.length < this._root.length) return
        for (let i = 0; i < this._root.length; i++) if (t.key[i] != this._root[i]) return
        let k = t.key.subarray(this._root.length)
        return this._next ? new _Range(k, t.value, this._root, this._next) : new _Range(k, t.value, this._root)
    }

    async *[Symbol.asyncIterator](): AsyncIterator<Store.Entry> {
        for (let i = this as _Range | void; i; i = await this.next() as _Range | void) yield [i.key, i.value]
    }

    private _next = _done
    private _root = bytes()
}

class _Empty implements Store.Range {
    static readonly zero = new _Empty

    async *[Symbol.asyncIterator](): AsyncIterator<Store.Entry> {
    }
}

type _Next = () => Promise<Store.Range | void>
let _done = async (): Promise<Store.Range | void> => { }

export default Store