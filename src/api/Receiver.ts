import { Key } from "../ethers/EthersTypes"
import { Digest } from "../ethers/EthersTools"
import { ethers } from "ethers"

/** Responsible for generating new addresses, given a common secret and context. */
export default class Receiver {
    /** Derive the private key given a shared secret and context. */
    static derive(key: Bytes, context: Bytes): Key.Private {
        return Digest.from(context, key) as Bytes as Key.Private
    }

    constructor(key: Bytes) {
        this._key = key
    }

    /** Address coresponding to a given context. */
    receive(context: Bytes): string {
        return ethers.utils.computeAddress(Receiver.derive(this._key, context))
    }

    private _key: Bytes
}