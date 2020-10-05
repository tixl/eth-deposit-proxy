import { unsigned, bytes } from "../core/Core"

class Writer {
    static unsigned(value: int): Bytes {
        if (!value) return _zero
        let t = [] as int[]
        for (let i = unsigned(value); i; i = (i - (i & 127)) / 128) t.push(i >= 128 ? 128 | (i & 127) : i)
        return bytes(t)
    }

    static packed(values: readonly Bytes[]): Bytes {
        let n = 0
        for (let i of values) n += i.length
        if (!n) return bytes()
        let a = values.filter(i => i.length)
        if (a.length == 1) return values[0]
        let t = new Uint8Array(n)
        for (let i of values) t = _write(t, i)
        return t
    }
}

namespace Writer {
    export interface Token<Type extends int | string | object | Bytes = int> {
        readonly value: Type
        readonly bytes: Bytes
    }
}

function _write(bytes: Uint8Array, value: Bytes): Uint8Array {
    if (value.length) bytes.set(value)
    return value.length ? bytes.subarray(value.length) : bytes
}

let _zero = bytes([0])

export default Writer