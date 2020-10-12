import { bytes } from "../core/Core"
import { Hex } from "../ethers/EthersTools"
import EthersSigner from "../ethers/EthersSigner"
import { Signing } from "../ethers/EthersTypes"

export default class Signer {
    static create(host?: string): EthersSigner {
        let t = new _Signer(host)
        return new EthersSigner(async data => await t.sign(data))
    }
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

    async sign(data: Signing.Signable): Promise<Signing.Signature> {
        let t = await (await fetch(`${this._host}sign/${Hex.encode(data)}`)).text()
        return (t ? Hex.decode(t) : bytes()) as Signing.Signature
    }

    private _host: string
}