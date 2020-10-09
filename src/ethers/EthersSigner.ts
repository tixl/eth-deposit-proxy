import { inject } from "../core/System"
import { ethers } from "ethers"
import EthersProvider from "./EthersProvider"
import fetch from "node-fetch"
import { bytes } from "../core/Core"

export default class EthersSigner {
    static from(mnemonic: string): EthersSigner {
        let t = ethers.Wallet.fromMnemonic(mnemonic).connect(inject(EthersProvider)["_provider"])
        let k = new ethers.utils.SigningKey(ethers.utils.arrayify(t.privateKey))
        return new EthersSigner(async data => {
            let t = k.signDigest(ethers.utils.keccak256(data))
            return ethers.utils.arrayify(ethers.utils.joinSignature(t))
        })
    }

    static host(host: string): EthersSigner {
        let t = new _Signer(host)
        return new EthersSigner(async data => await t.sign(data))
    }

    constructor(sign: (data: Bytes) => Promise<Bytes>) {
        this._sign = sign
    }

    async sign(data: Bytes): Promise<Bytes> {
        return await this._sign(data)
    }

    async key(): Promise<Bytes> {
        let t = ethers.utils.arrayify(ethers.utils.keccak256(new Uint8Array))
        return ethers.utils.arrayify(ethers.utils.recoverPublicKey(t, await this.sign(new Uint8Array)))
    }

    async address(): Promise<string> {
        return ethers.utils.computeAddress(await this.key())
    }

    private _sign: (data: Bytes) => Promise<Bytes>
}

class _Signer {
    constructor(host?: string) {
        if (!host) host = "http://localhost:2080"
        if (!host.startsWith("http://") && !host.startsWith("https://")) host = `http://${host}`
        let t = new URL(host)
        t.search = ""
        if (!t.port) t.port = "2080"
        this._host = t.href
    }

    async sign(data: Bytes): Promise<Bytes> {
        let t = await (await fetch(`${this._host}sign/${ethers.utils.hexlify(data)}`)).text()
        return t ? ethers.utils.arrayify(t) : bytes()
    }

    private _host: string
}