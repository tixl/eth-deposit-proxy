import { assert, bytes, unsigned } from "../core/Core"

class Data {
    static readonly unsigned = new class implements Data.Type<int> {
        encode(value?: int): Bytes {
            if (!value) return this._zero
            let t = [] as int[]
            for (let i = unsigned(value); i; i = (i - (i & 127)) / 128) t.push(t.length ? (i & 127) | 128 : i & 127)
            return bytes(t.reverse())
        }

        decode(data: Bytes): Data.Part<int> {
            let t = 0
            for (let i = 0; i < data.length; i++) {
                assert(t <= 0x3FFFFFFFFFFF)
                let v = data[i]
                t = (t * 128) + (v & 127)
                if (v <= 127) return { value: t, stack: data.subarray(i + 1) }
            }
            assert(false)
        }

        private _zero = bytes([0])
    }

    static readonly bytes = new class implements Data.Type<Bytes> {
        encode(value?: Bytes): Bytes {
            return Data.packed.encode([Data.unsigned.encode(value?.length || 0), value || bytes()])
        }

        decode(data: Bytes): Data.Part<Bytes> {
            let t = Data.unsigned.decode(data)
            return Data.fixed(t.value).decode(t.stack)
        }
    }

    static readonly string = new class implements Data.Type<string> {
        encode(value?: string): Bytes {
            return Data.bytes.encode(value?.length ? _utf8.encoder.encode(value) : bytes())
        }

        decode(data: Bytes): Data.Part<string> {
            let t = Data.bytes.decode(data)
            return { value: t.value.length ? _utf8.decoder.decode(t.value) : "", stack: t.stack }
        }
    }

    static readonly packed = new class implements Data.Type<readonly Bytes[]> {
        encode(value?: readonly Bytes[]): Bytes {
            let n = 0
            if (value) for (let i of value) n += i.length
            if (!n) return bytes()
            let a = value ? value.filter(i => i.length) : []
            if (a.length == 1) return a[0]
            let t = new Uint8Array(n)
            for (let i of a) t = (t.set(i), t.subarray(i.length))
            return new Uint8Array(t.buffer)
        }

        decode(data: Bytes, type?: readonly Data.Type<Bytes>[]): Data.Part<readonly Bytes[]> {
            let t = { value: [] as Bytes[], stack: data } as Data.Part<readonly Bytes[]>
            if (type) for (let i of type) {
                let p = i.decode(t.stack)
                t = { value: [...t.value, p.value], stack: t.stack }
            }
            return t
        }
    }

    static boxed<Type>(type: Data.Type<Type>): Data.Type<Type> {
        return new class implements Data.Type<Type> {
            encode(value?: Type): Bytes {
                let t = type.encode(value)
                return Data.packed.encode([Data.unsigned.encode(t.length), t])
            }

            decode(data: Bytes): Data.Part<Type> {
                let t = Data.unsigned.decode(data)
                assert(t.value <= t.stack.length)
                if (!t.value) return type.decode(bytes())
                return type.decode(t.value != t.stack.length ? t.stack.subarray(0, t.value) : t.stack)
            }
        }
    }

    static fixed(size: int): Data.Type<Bytes> {
        return !unsigned(size) ? _zero : new class implements Data.Type<Bytes> {
            encode(value?: Bytes): Bytes {
                return Data.packed.encode([Data.unsigned.encode(value?.length || 0), value || bytes()])
            }

            decode(data: Bytes): Data.Part<Bytes> {
                assert(size <= data.length)
                if (!size) return { value: bytes(), stack: data }
                if (size == data.length) return { value: data, stack: bytes() }
                return { value: data.subarray(0, size), stack: data.subarray(size) }
            }
        }
    }

    static pack(type: (pack: <T>(type: Data.Type<T>, value: T) => T) => void): Bytes {
        let t = [] as Bytes[]
        type((pack, value) => {
            let p = pack.encode(value)
            if (!p.length) return value
            t.push(p)
            return value
        })
        return this.packed.encode(t)
    }

    static read<Type>(data: Bytes, type: (read: <T>(type: Data.Type<T>) => T) => Type): Type {
        let v = void 0
        let s = data
        return type((type: Data.Type<any>): any => {
            let t = type.decode(s)
            v = t.value
            s = t.stack
            return v
        })
    }

    static encode(value: string): Bytes {
        return value ? _utf8.encoder.encode(value) : bytes()
    }

    static decode(data: Bytes): string {
        return data.length ? _utf8.decoder.decode(data) : ""
    }
}

namespace Data {
    export interface Type<Type> {
        encode(value?: Type): Bytes
        decode(data: Bytes): Part<Type>
    }

    export interface Part<Type> {
        readonly value: Type
        readonly stack: Bytes
    }
}

let _zero = {
    encode: (_?: Bytes) => bytes(),
    decode: (data: Bytes) => ({ value: bytes(), stack: data } as Data.Part<Bytes>),
} as const

let _utf8 = {
    encoder: new TextEncoder,
    decoder: new TextDecoder,
} as const

export default Data