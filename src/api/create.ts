import { ethers } from "ethers"
import { Express } from "express"
import { inject } from "../core/System"
import EthersSigner from "../ethers/EthersSigner"
import Receiver from "../contracts/Receiver"

export default (host: Express) => {
    host.post("/create", async (req, res) => {
        let k = Buffer.from(req.body.chainSigPubKey as string, "hex")
        let s = await inject(EthersSigner).sign(k)
        let a = inject(Receiver).receive(k)
        res.end({ address: a, signature: ethers.utils.hexlify(s).slice(2) })
    })
}