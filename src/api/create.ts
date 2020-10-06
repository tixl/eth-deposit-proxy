import { inject } from "../core/System"
import Service from "./Service"
import { Express } from "express"

export default (host: Express) => {
    host.post("/create", async (req, res) => {
        let k = Buffer.from(req.body.chainSigPubKey as string, "hex")
        let t = inject(Service)
        await t.add(k)
        res.end({ address: t.receive(k), signature: Buffer.from(t.sign(k, k)).toString("hex") })
    })
}