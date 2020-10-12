import { bytes } from "../core/Core"
import { Key, Signing } from "./EthersTypes"
import { Digest, Hex, Signer } from "./EthersTools"
import { ethers } from "ethers"

export default class EthersSigner {
    static from(key: Key.Private): EthersSigner {
        return new EthersSigner(async data => Signer.sign(Digest.from(data), key))
    }

    constructor(sign: (data: Signing.Signable) => Promise<Signing.Signature>) {
        this._sign = sign
    }

    async sign(data: Signing.Signable): Promise<Signing.Signature> {
        return await this._sign(data)
    }

    async key(): Promise<Bytes> {
        let t = Digest.from(bytes())
        return Hex.decode(ethers.utils.recoverPublicKey(t, await this.sign(bytes() as Signing.Signable)))
    }

    async address(): Promise<string> {
        return ethers.utils.computeAddress(await this.key())
    }

    private _sign: (data: Signing.Signable) => Promise<Signing.Signature>
}