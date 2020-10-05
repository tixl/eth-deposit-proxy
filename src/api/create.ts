import { ethers } from "ethers"
import { Express } from "express"
import { inject } from "../core/System"
import Service from "./Service"

export default (host: Express) => {
    host.post("/create", async (req, res) => {
        let k = Buffer.from(req.body.chainSigPubKey as string, "hex")
        let t = inject(Service)
        await t.add(k)
        res.end({ address: t.receive(k), signature: ethers.utils.hexlify(t.sign(k)).slice(2) })
    })
}