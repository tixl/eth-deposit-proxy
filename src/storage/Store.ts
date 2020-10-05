import { bytes, is } from "../core/Core"

/** Database abstraction. The model required by the constructor provides the actual implementation. */
class Store {
    /** Create an iterator over a range of values. */
    static range(key: Bytes, value: Bytes, root?: Bytes, next?: _Next): Store.Range {
        return new _Range(key, value, root, next)
    }

    /** Close this store. */
    static async close(store: Store): Promise<void> {
        await store._model.close()
    }

    constructor(model: Store | Store.Model, topic?: Bytes) {
        this._model = is(model, Store) ? model._model : model
        this._topic = bytes(is(model, Store) && model._topic.length ? [...model._topic, ...(topic || [])] : topic)
    }

    /** Find a record mapped to the key. */
    async get(key: Bytes): Promise<Bytes> {
        return await this._model.get(this._key(key))
    }

    /** Update a record mapped to the key. */
    async set(key: Bytes, value?: Bytes): Promise<void> {
        await this._model.set(key, this._key(value || bytes()))
    }

    /** Returns an iterable range of stored records. */
    async range(prefix?: Bytes): Promise<Store.Range | void> {
        return await this._model.range(this._key(prefix || bytes()))
    }

    /** Batch write. */
    async batch(items: readonly (readonly [Bytes, Bytes] | Bytes)[]): Promise<void> {
        if (!items.length) return
        let t = items
        if (this._topic.length) t = t.map(i => is(i, Uint8Array) ? this._key(i) : [this._key(i[0]), i[1]])
        await this._model.batch(t)
    }

    private _key(key: Bytes): Bytes {
        if (!key.length) return this._topic
        return this._topic.length ? bytes([...this._topic, ...key]) : key
    }

    private _model: Store.Model
    private _topic: Bytes
}

namespace Store {
    export interface Model {
        get(key: Bytes): Promise<Bytes>
        set(key: Bytes, value?: Bytes): Promise<void>
        range(scope: Bytes): Promise<Range | void>
        batch(items: readonly (readonly [Bytes, Bytes] | Bytes)[]): Promise<void>
        close(): Promise<void>
    }

    export interface Range {
        readonly key: Bytes
        readonly value: Bytes
        next(): Promise<Range | void>
    }
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
        let t = this._next != _done ? await this._next() : void 0
        if (!t || !this._root.length) return t
        if (t.key.length < this._root.length) return
        for (let i = 0; i < this._root.length; i++) if (t.key[i] != this._root[i]) return
        let k = t.key.slice(this._root.length, t.key.length - this._root.length)
        return this._next ? new _Range(k, t.value, this._root, this._next) : new _Range(k, t.value, this._root)
    }

    private _next = _done
    private _root = bytes()
}

type _Next = () => Promise<Store.Range | void>
let _done = async (): Promise<Store.Range | void> => { }

export default Store