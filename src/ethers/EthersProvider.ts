import { Payment, Provider, Transaction, Key, Public } from "./EthersTypes"
import { ethers } from "ethers"
import JSBI from "jsbi"

class EthersProvider implements Provider {
    static readonly model = `${process.env["HOME"]}/.rinkeby/geth.ipc` as EthersProvider.Model

    constructor(model?: EthersProvider.Model) {
        this._provider = _connection(model || EthersProvider.model)
    }

    async balance(address: string): Promise<Natural> {
        return JSBI.BigInt((await this._provider.getBalance(address)).toString())
    }

    async send(transaction: Transaction): Promise<string> {
        if (!transaction.signed.length) return ""
        let s = transaction.signed[0].signatures[0].data
        let t = ethers.utils.serializeTransaction({
            to: transaction.to[0].to,
            value: ethers.BigNumber.from(`${transaction.from[0].value}`),
            nonce: transaction.from[0].nonce,
            gasLimit: ethers.BigNumber.from(`${transaction.from[0].gasLimit}`),
            gasPrice: ethers.BigNumber.from(`${transaction.from[0].gasPrice}`),
            data: transaction.from[0].data,
            chainId: transaction.from[0].chain,
        }, s)
        let r = await this._provider.sendTransaction(t)
        return r.hash
    }

    async poll(_address: string, _afterTransaction?: string): Promise<readonly string[]> {
        throw new Error("Transaction history is not supported.")
    }

    async transaction(hash: string): Promise<Payment> {
        let t = await this._provider.getTransaction(hash)
        let s = ethers.utils.joinSignature({ r: t.r as string, s: t.s, v: t.v })
        let m = ethers.utils.arrayify(hash || "0x")
        let k = { type: "Public", data: ethers.utils.arrayify(ethers.utils.recoverPublicKey(m, s)) } as Key<Public>
        return {
            transaction: {
                from: [{
                    from: t.from || "",
                    value: JSBI.BigInt(`${t.value}`),
                    nonce: t.nonce,
                    gasLimit: JSBI.BigInt(`${t.gasLimit}`),
                    gasPrice: JSBI.BigInt(`${t.gasPrice}`),
                    data: t.data,
                    chain: t.chainId,
                }],
                to: [{ to: t.to || "", value: JSBI.BigInt(`${t.value}`) }],
                signable: [],
                signed: [{
                    data: m,
                    signatures: [{ data: ethers.utils.arrayify(s), signer: { name: t.from || "", key: k } }],
                }],
            },
            confirmations: t.confirmations,
        }
    }

    private _provider: ethers.providers.Provider
}

namespace EthersProvider {
    export type Model =
        | string
        | IPCConnection
        | WebSocketConnection
        | HTTPConnection

    export interface IPCConnection {
        readonly type: "IPC"
        readonly path: string
    }

    export interface WebSocketConnection {
        readonly type: "WebSocket"
    }

    export interface HTTPConnection {
        readonly type: "HTTP"
        readonly host: string
    }
}

function _connection(connection: EthersProvider.Model): ethers.providers.Provider {
    if (typeof connection == "string") {
        if (connection.startsWith("http://") || connection.startsWith("https://")) connection = {
            type: "HTTP",
            host: connection,
        }
        else connection = {
            type: "IPC",
            path: connection,
        }
    }
    if (connection.type == "IPC") return new ethers.providers.IpcProvider(connection.path)
    if (connection.type == "HTTP") return new ethers.providers.JsonRpcProvider(_host(connection.host))
    throw new Error(connection.type)
}

function _host(host: string, port?: int): string {
    let t = new URL(host.startsWith("http://") || host.startsWith("https://") ? host : `http://${host}`)
    t.search = ""
    if (!t.port) t.port = port ? `${port}` : "8545"
    return t.href
}

export default EthersProvider