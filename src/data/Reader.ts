import { assert, bytes, is, unsigned } from "../core/Core"

class Reader {
    static read<Type extends readonly unknown[]>(data: Bytes, type: Type): Reader.Value<Type> {
        let t = [] as unknown[]
        for (let i of type) {
            if (is(i, Number)) {
                let v = this.bytes(data, i)
                t.push(v.value)
                data = v.bytes
                continue
            }
            if (is(i, Function)) {
                if (is(i(), Number)) {
                    let v = this.unsigned(data)
                    t.push(v.value)
                    data = v.bytes
                    continue
                }
                if (is(i(), Uint8Array)) {
                    let v = this.bytes(data)
                    t.push(v.value)
                    data = v.bytes
                    continue
                }
            }
        }
        return t as unknown as Reader.Value<Type>
    }

    static unsigned(data: Bytes): Reader.Token<int> {
        let t = 0
        for (let i = 0; i < data.length; i++) {
            assert(t <= 0x3FFFFFFFFFFF)
            let v = data[i]
            t = (t * 128) + (v & 127)
            if (v <= 127) return { value: t, bytes: data.subarray(i + 1) }
        }
        assert(false)
    }

    static bytes(data: Bytes, size?: int): Reader.Token<Bytes> {
        let t = { value: unsigned(size || 0), bytes: data } as const
        if (!is(size)) t = this.unsigned(data)
        assert(t.value <= t.bytes.length)
        if (!t.value) return { value: bytes(), bytes: t.bytes }
        if (t.value == t.bytes.length) return { value: t.bytes, bytes: bytes() }
        return { value: t.bytes.subarray(0, t.value), bytes: t.bytes.subarray(t.value) }
    }
}

namespace Reader {
    export interface Token<Type extends int | string | object | Bytes = int> {
        readonly value: Type
        readonly bytes: Bytes
    }

    export type Value<T> = {
        readonly [K in keyof T]: T[K] extends (...p: infer _P) => infer R ? R : T[K] extends int ? Bytes : T[K]
    }
}

export default Reader