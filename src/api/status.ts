import { Express } from "express"

export default (host: Express) => {
    host.get("/status/:InTxHash", async (req, res) => {
        let h = req.params["InTxHash"] as string

    })
}