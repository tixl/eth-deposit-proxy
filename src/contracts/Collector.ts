import Compiler from "./Compiler"
import Contract from "./Contract"
import Receiver from "./Receiver"
import EthersWallet from "../ethers/EthersWallet"
import { ethers } from "ethers"

export default class Collector {
    static async deploy(address: string, wallet: EthersWallet): Promise<string> {
        let t = Compiler.compile(_collect(address))["Collect"]
        return t ? await Contract.deploy(t, wallet) : ""
    }

    constructor(creator: string, address: string, wallet: EthersWallet) {
        this.creator = creator
        this.address = address
        let t = Compiler.compile(_collect(address))["Collect"]
        if (t) this._contract = new ethers.Contract(creator, t.abi as ethers.ContractInterface, wallet["_wallet"])
    }

    readonly creator: string
    readonly address: string

    async collect(context: Bytes): Promise<void> {
        if (this._contract) await this._contract.functions.collect(context, {
            gasLimit: (await this._contract.estimateGas.collect(context)).mul(2),
            gasPrice: await this._contract.provider.getGasPrice(),
        })
    }

    private _contract = void 0 as ethers.Contract | void
}

let _collect = (address: string) => Contract.code(`
${Receiver.code(address)}

contract Collect {
    address private immutable _owner;

    constructor() {
        _owner = msg.sender;
    }

    function collect(bytes memory context) public {
        require(msg.sender == _owner);
        bytes memory code = type(Receive).creationCode;
        bytes32 data = keccak256(context);
        assembly { let t := create2(0, add(code, 32), mload(code), data) }
    }

    function destroy() public {
        require(msg.sender == _owner);
        selfdestruct(payable(_owner));
    }
}
`)