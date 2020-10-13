import { ethers } from "ethers"
import EthersProvider from "../ethers/EthersProvider"
import EthersSigner from "./EthersSigner"
import EthersWallet from "./EthersWallet"
import Compiler from "./Compiler"
import Contract from "./Contract"

export default class Module {
    constructor(address: string, creator?: string) {
        this.address = address
        if (creator) this.creator = creator
        let t = (modules => ({
            receive: modules["Wallet"] as Compiler.Module,
            collect: modules["Collect"] as Compiler.Module,
        } as const))(Compiler.compile(_module(address)))
        this._receive = t.receive
        this._collect = t.collect
    }

    readonly address: string
    readonly creator = "" as string

    async deploy(provider: EthersProvider, signer: EthersSigner): Promise<string> {
        let t = {
            abi: this._collect.abi as ethers.ContractInterface,
            bytecode: this._collect.bytecode,
        }
        let f = new ethers.ContractFactory(t.abi, t.bytecode, new EthersWallet(provider, signer)["_wallet"])
        return (await f.deploy()).address
    }

    create(context: Bytes): string {
        let t = ethers.utils.keccak256(context)
        return ethers.utils.getCreate2Address(this.creator, t, ethers.utils.keccak256(this._receive.bytecode))
    }

    private _receive: Compiler.Module
    private _collect: Compiler.Module
}

let _module = (address: string) => Contract.code(`
${Contract.head()}

contract Wallet {
    constructor() {
        selfdestruct(payable(${address}));
    }
}

contract Master {
    address private immutable _owner;

    constructor() {
        _owner = msg.sender;
    }

    function collect(bytes memory context) public {
        require(msg.sender == _owner);
        bytes memory code = type(Wallet).creationCode;
        bytes32 data = keccak256(context);
        assembly { let t := create2(0, add(code, 32), mload(code), data) }
    }

    function destroy() public {
        require(msg.sender == _owner);
        selfdestruct(payable(_owner));
    }
}
`)