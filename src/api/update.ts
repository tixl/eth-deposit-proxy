import { inject } from "../core/System"
import Service from "./Service"
import { Express } from "express"

export default (host: Express) => {
    host.post("/update", async (req, res) => {
        let t = inject(Service)

    })
}