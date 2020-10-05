import { assert, bytes, unsigned } from "../core/Core"

class Reader {
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

    static bytes(data: Bytes, size: int): Reader.Token<Bytes> {
        assert(unsigned(size) <= data.length)
        if (!size) return { value: bytes(), bytes: data }
        if (size == data.length) return { value: data, bytes: bytes() }
        return { value: data.subarray(0, size), bytes: data.subarray(size) }
    }
}

namespace Reader {
    export interface Token<Type extends int | string | object | Bytes = int> {
        readonly value: Type
        readonly bytes: Bytes
    }
}

export default Reader