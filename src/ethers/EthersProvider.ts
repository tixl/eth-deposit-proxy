import { unsigned } from "../core/Core"
import { Payment, Provider, Transaction } from "./EthersTypes"
import EthersEngine from "./EthersEngine"
import { Big, Hex } from "./EthersTools"
import { ethers } from "ethers"

class EthersProvider implements Provider {
    static readonly model = `${process.env["HOME"]}/.rinkeby/geth.ipc` as EthersProvider.Model

    constructor(model?: EthersProvider.Model) {
        this._provider = _connection(model || EthersProvider.model)
    }

    get blocks(): int {
        return this._blocks
    }

    get chain(): int {
        return this._chain
    }

    get gas(): { readonly limit: Natural, readonly price: Natural } {
        return this._gas
    }

    async update(): Promise<void> {
        if (!this._chain) this._chain = (await this._provider.getNetwork()).chainId
        this._blocks = await this._provider.getBlockNumber() + 1
        this._gas = {
            limit: Big.int(await this._provider.estimateGas({})),
            price: Big.int(await this._provider.getGasPrice()),
        }
    }

    async block(block: int): Promise<readonly string[]> {
        return (await this._provider.getBlock(unsigned(block))).transactions
    }

    async balance(address: string): Promise<Natural> {
        return Big.int((await this._provider.getBalance(address)).toString())
    }

    async send(transaction: Transaction): Promise<string> {
        if (!transaction.signed.length) return ""
        let t = EthersEngine.signables(transaction)[0]
        let r = await this._provider.sendTransaction(Hex.encode(t))
        return r.hash
    }

    async poll(_address: string, _afterTransaction?: string): Promise<readonly string[]> {
        throw new Error("Transaction history is not supported.")
    }

    async transaction(hash: string): Promise<Payment> {
        let t = await this._provider.getTransaction(hash)
        let s = ethers.utils.joinSignature({ r: t.r as string, s: t.s, v: t.v })
        return {
            transaction: EthersEngine.transaction(Hex.decode(ethers.utils.serializeTransaction(t, s))),
            confirmations: t.confirmations,
        }
    }

    private _provider: ethers.providers.Provider
    private _gas = { limit: Big.int(), price: Big.int() } as const
    private _blocks = 0
    private _chain = 0
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
        readonly host: string
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