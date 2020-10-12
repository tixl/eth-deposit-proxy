import { int, is } from "../core/Core"
import { ethers } from "ethers"
import JSBI from "jsbi"

/** Hex encoding and decoding. */
export class Hex {
    static encode(data: Bytes): string {
        return ethers.utils.hexlify(data)
    }

    static decode(data: string): Bytes {
        return ethers.utils.arrayify(data, { allowMissingPrefix: true })
    }
}

/** Big numbers. */
export class Big {
    /** Convert `ethers.BigNumber | string | int` to  Natural. */
    static int(value?: ethers.BigNumber | string | int): Natural {
        return value ? is(value, Number) ? JSBI.BigInt(int(value)) : JSBI.BigInt(`${value}`) : _zero
    }

    /** Returns `1` if `a > b`, `-1` if `a < b`, `0` if `a == b`. */
    static compare(a: Natural | int, b: Natural | int): int {
        if (is(a, Number)) a = this.int(a)
        if (is(b, Number)) b = this.int(b)
        if (JSBI.equal(a, b)) return 0
        return JSBI.greaterThan(a, b) ? 1 : -1
    }

    /** Addition. */
    static add(a: Natural | int, b: Natural | int): Natural {
        return JSBI.add(is(a, Number) ? this.int(a) : a, is(b, Number) ? this.int(b) : b)
    }

    /** Subtraction. */
    static subtract(a: Natural | int, b: Natural | int): Natural {
        return JSBI.subtract(is(a, Number) ? this.int(a) : a, is(b, Number) ? this.int(b) : b)
    }

    /** Multiplication. */
    static multiply(a: Natural | int, b: Natural | int): Natural {
        return JSBI.multiply(is(a, Number) ? this.int(a) : a, is(b, Number) ? this.int(b) : b)
    }
}

/** Provides ability to sign any data. */
export class Signer {
    /** Sign any data with a private key. */
    static sign(data: Bytes, key: Bytes): Bytes {
        let d = ethers.utils.keccak256(data)
        let k = new ethers.utils.SigningKey(key)
        let s = k.signDigest(d)
        return Hex.decode(ethers.utils.joinSignature(s))
    }
}

let _zero = JSBI.BigInt(0)