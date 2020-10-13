import Compiler from "./Compiler"
import Contract from "./Contract"
import Receiver from "./Receiver"
import EthersWallet from "./EthersWallet"
import { ethers } from "ethers"
import { Signing, Transaction } from "../ethers/EthersTypes"
import JSBI from "jsbi"
import { Big } from "../ethers/EthersTools"

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

    async sign(transaction: Transaction): Promise<Transaction> {
        if (!this._contract || !transaction.signable.length) return transaction
        let t = ethers.utils.arrayify(await this._contract.signer.signTransaction({
            from: transaction.from[0].from,
            to: transaction.to[0].to,
            value: ethers.BigNumber.from(`${transaction.to[0].value}`),
            data: transaction.data,
            nonce: transaction.nonce,
            gasLimit: ethers.BigNumber.from(`${transaction.gas.limit}`),
            gasPrice: ethers.BigNumber.from(`${transaction.gas.price}`),
            chainId: transaction.chain,
        }))
        return { ...transaction, signed: [{ data: transaction.signable[0], signatures: [t as Signing.Signature] }] }
    }

    async transaction(context: Bytes): Promise<Transaction | void> {
        if (!this._contract) return
        let t = await this._contract.populateTransaction.collect(context)
        return {
            from: [{
                from: t.from || "",
                value: JSBI.BigInt(`${t.value || "0"}`),
            }],
            to: [{
                to: t.to || "",
                value: JSBI.BigInt(`${t.value}`),
            }],
            signable: [ethers.utils.arrayify(ethers.utils.serializeTransaction(t)) as Signing.Signable],
            signed: [],
            nonce: t.nonce || 0,
            gas: { limit: Big.int(t.gasLimit), price: Big.int(t.gasPrice) },
            data: t.data ?? "",
            chain: t.chainId ?? 0,
        }
    }

    async collect(context: Bytes): Promise<void> {
        if (this._contract) await this._contract.collect(context, {
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