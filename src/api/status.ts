import { inject } from "../core/System"
import Service from "./Service"
import { Express } from "express"

export default (host: Express) => {
    host.get("/status/:InTxHash", async (req, res) => {
        let k = Buffer.from(req.body.chainSigPubKey as string, "hex")
        let t = inject(Service)

    })
}