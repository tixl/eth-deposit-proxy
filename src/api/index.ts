import Public from "./Public"
import Internal from "./Internal"
import { Express } from "express"

export default (host: Express) => {
    let s = new _Services
    host.post("/create", async (req, res) => {
        let p = Buffer.from(req.body as string, "hex")
        let r = await s.public.create(p)
        if (r) res.end(r)
        else res.end()
    })
    host.get("/status/:address", async (req, res) => {
        let a = req.params.address as string
        let r = await s.public.status(a)
        if (r) res.end(JSON.stringify(r))
        else res.end()
    })
    host.get("/address/:context", (req, res) => {
        res.end(s.internal.address(req.params.context as string))
    })
    // host.post("/start", (req, res) => {
    //     s.internal.start(10, 1)
    //     res.end()
    // })
    host.post("/update", async (_req, res) => {
        await s.internal.update()
        res.end()
    })
}

class _Services {
    readonly public = new Public
    readonly internal = new Internal
}