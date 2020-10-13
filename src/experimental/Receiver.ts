import Compiler from "./Compiler"
import Contract from "./Contract"
import { ethers } from "ethers"
import { bytes } from "../core/Core"

export default class Receiver {
    static code(address: string): string {
        return _receive(address)
    }

    constructor(creator: string, address: string) {
        this.creator = creator
        this.address = address
        let t = Compiler.compile(_receive(address))["Receive"]
        if (t) this._contract = ethers.utils.arrayify(ethers.utils.keccak256(t.bytecode))
    }

    readonly creator: string
    readonly address: string

    receive(context: Bytes): string {
        let t = ethers.utils.keccak256(context)
        return ethers.utils.getCreate2Address(this.creator, t, this._contract)
    }

    private _contract = bytes()
}

let _receive = (address: string) => Contract.code(`
${Contract.head()}

contract Receive {
    constructor() {
        selfdestruct(payable(${address}));
    }
}
`)