import { inject } from "../core/System"
import Service from "./Service"
import { Express } from "express"
import { is } from "../core/Core"

export default (host: Express) => {
    host.get("/status/:address", async (req, res) => {
        let a = req.params.address as string
        let t = inject(Service)
        await t.update()
        let n = await t.index(a)
        if (!is(n)) return res.end()
        let r = await t.at(n)
        res.end(JSON.stringify({
            confirmations: r.block ? t.provider.blocks - r.block : 0,
            transaction: r.transaction,
        }))
    })
}