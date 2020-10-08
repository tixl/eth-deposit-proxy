import { inject } from "../core/System"
import Service from "./Service"
import { Express } from "express"
import JSBI from "jsbi"

export default (host: Express) => {
    host.post("/update", async (req, res) => {
        let t = inject(Service)
        await t.update()
        for await (let i of t) if (JSBI.notEqual(i.balance, JSBI.BigInt("0")) && i.block) {
            let c = await t.provider.blocks() - i.block
            if (c >= _minConfirmations) await t.collect(i)
        }
        res.end()
    })
}

let _minConfirmations = 6