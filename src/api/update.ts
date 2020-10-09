import { inject } from "../core/System"
import Service from "./Service"
import { Express } from "express"
import JSBI from "jsbi"

export default (host: Express) => {
    host.post("/update", async (_req, res) => {
        let t = inject(Service)
        await t.update()
        for await (let i of t) if (JSBI.notEqual(i.balance, JSBI.BigInt("0")) && i.block) {
            let c = t.provider.blocks - i.block
            if (c < _minConfirmations) continue
            let r = await t.collect(i)
            if (r) await t.provider.send(r)
        }
        res.end()
    })
}

let _minConfirmations = 6