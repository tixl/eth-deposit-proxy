import { ethers } from "ethers"
import { Express } from "express"
import { inject } from "../core/System"
import EthersSigner from "../ethers/EthersSigner"
import Receiver from "../contracts/Receiver"
import Service from "./Service"

export default (host: Express) => {
    host.post("/create", async (req, res) => {
        let k = Buffer.from(req.body.chainSigPubKey as string, "hex")
        let t = inject(Service)
        await t.add(k)
        let s = await inject(EthersSigner).sign(k)
        let a = t.receive(k)
        res.end({ address: a, signature: ethers.utils.hexlify(s).slice(2) })
    })
}