import { ethers } from "ethers"

export default class Receiver {
    constructor(key: Bytes) {
        this._key = key
    }

    receive(context: Bytes): string {
        return ethers.utils.computeAddress(this._derive(context))
    }

    private _derive(context: Bytes): Bytes {
        return ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.concat([context, this._key])))
    }

    private _key: Bytes
}