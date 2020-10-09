import Compiler from "./Compiler"
import Contract from "./Contract"
import Receiver from "./Receiver"
import EthersWallet from "../ethers/EthersWallet"
import { ethers } from "ethers"
import { Signable, Signature, Transaction } from "../ethers/EthersTypes"
import JSBI from "jsbi"

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
            data: transaction.from[0].data,
            nonce: transaction.from[0].nonce,
            gasLimit: ethers.BigNumber.from(`${transaction.from[0].gasLimit}`),
            gasPrice: ethers.BigNumber.from(`${transaction.from[0].gasPrice}`),
            chainId: transaction.from[0].chain,
        }))
        let s = {
            data: t,
            signer: { key: { type: "Public", data: this._key(transaction.signable[0].data, t) }, name: "" },
        } as Signature
        return { ...transaction, signed: [{ data: transaction.signable[0].data, signatures: [s] }] }
    }

    async transaction(context: Bytes): Promise<Transaction | void> {
        if (!this._contract) return
        let t = await this._contract.populateTransaction.collect(context)
        let s = {
            data: ethers.utils.arrayify(ethers.utils.serializeTransaction(t)),
            signers: [""],
        } as Signable
        return {
            from: [{
                from: t.from || "",
                value: JSBI.BigInt(`${t.value || "0"}`),
                data: t.data || "",
                nonce: t.nonce || 0,
                gasLimit: JSBI.BigInt(`${t.gasLimit}`),
                gasPrice: JSBI.BigInt(`${t.gasPrice}`),
                chain: t.chainId || 0,
            }],
            to: [{
                to: t.to || "",
                value: JSBI.BigInt(`${t.value}`),
            }],
            signable: [s],
            signed: [],
        }
    }

    async collect(context: Bytes): Promise<void> {
        if (this._contract) await this._contract.collect(context, {
            gasLimit: (await this._contract.estimateGas.collect(context)).mul(2),
            gasPrice: await this._contract.provider.getGasPrice(),
        })
    }

    private _key(signable: Bytes, signature: Bytes): Bytes {
        let t = ethers.utils.keccak256(signable)
        return ethers.utils.arrayify(ethers.utils.recoverPublicKey(t, signature))
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