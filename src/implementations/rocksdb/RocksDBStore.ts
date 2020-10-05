import { bytes, is } from "../../core/Core"
import Store from "../../storage/Store"
import RocksDB from "rocksdb"
import nodePath from "path"

/** Store backed by RocksDB. */
export default class RocksDBStore implements Store.Model {
    /** Create a new store. */
    static async create(path?: string): Promise<Store> {
        return new Promise<Store>((done: (value: Store) => void, fail: () => void): void => {
            let t = new RocksDBStore(path || "Data")
            t._db.open((error?: Error): void => error ? fail() : done(new Store(t)))
        })
    }

    constructor(path?: string) {
        this._db = new RocksDB(nodePath.posix.relative("", `${__dirname}/${path || "data"}`))
    }

    async get(key: Bytes): Promise<Bytes> {
        if (!key.length) {
            let t = global.Buffer.from("__RocksDB.zero__")
            key = bytes(t)
        }
        return new Promise<Bytes>((done: (value: Bytes) => void): void => {
            this._db.get(_bytes(key), (error: Error | undefined, value: Buffer | string): void => {
                done(!error && value ? bytes(value as Buffer) : bytes())
            })
        })
    }

    async set(key: Bytes, value: Bytes): Promise<void> {
        if (!key.length) {
            let t = global.Buffer.from("__RocksDB.zero__")
            key = bytes(t)
        }
        if (!value.length) return new Promise<void>((done: () => void, fail: () => void): void => {
            this._db.del(_bytes(key), (error?: Error): void => error ? fail() : done())
        })
        return new Promise<void>((done: () => void, fail: () => void): void => {
            this._db.put(_bytes(key), _bytes(value), (error?: Error): void => error ? fail() : done())
        })
    }

    async range(prefix: Bytes): Promise<Store.Range | void> {
        return new Promise((done: (value: Store.Range | void) => void): void => {
            if (!this._db) return done()
            let t = this._db.iterator({ gte: _bytes(prefix) })
            t.next((error: Error | void, key: string | Buffer, value: string | Buffer): void => {
                if (error) return done()
                let k = bytes(key as Buffer)
                let v = bytes(value as Buffer)
                done(_range(t, k, v, _bytes(prefix)))
            })
        })
    }

    async batch(items: readonly (readonly [Bytes, Bytes] | Bytes)[]): Promise<void> {
        if (items.length) return new Promise<void>((done: () => void, fail: () => void): void => {
            this._db.batch(items.map(x => {
                if (is(x, Array as unknown as new () => readonly [Bytes, Bytes])) {
                    let k = x[0].length ? _bytes(x[0]) : global.Buffer.from("__LEVELDB_EMPTY__")
                    return x[1].length ? { type: "put", key: k, value: _bytes(x[1]) } : { type: "del", key: k }
                }
                let k = x.length ? _bytes(x) : global.Buffer.from("__LEVELDB_EMPTY__")
                return { type: "del", key: k }
            }), (error?: {}): void => error ? fail() : done())
        })
    }

    async close(): Promise<void> {
        await new Promise((done: () => void): void => this._db.close(() => done()))
    }

    private _db: RocksDB
}

function _range(iterator: RocksDB.Iterator, key: Bytes, value: Bytes, scope: Bytes): Store.Range | void {
    return Store.range(key, value, scope, async (): Promise<Store.Range | void> => {
        return await new Promise((done: (value: Store.Range | void) => void): void => {
            iterator.next((error: Error | void, key: string | Buffer, value: string | Buffer): void => {
                if (error) return iterator.end((_error?: Error): void => done())
                done(_range(iterator, bytes(key as Buffer), bytes(value as Buffer), scope))
            })
        })
    })
}

function _bytes(data: Bytes): Buffer {
    return Buffer.from(data.buffer as ArrayBuffer, data.byteOffset, data.length)
}