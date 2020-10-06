import { inject } from "../core/System"
import Service from "./Service"
import { Express } from "express"

export default (host: Express) => {
    host.post("/update", async (req, res) => {
        let t = inject(Service)
        await t.update()
        // let r = await t.find(req.balance, req.confirmations)
        res.end({})
    })
}