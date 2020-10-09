import create from "./create"
import status from "./status"
import update from "./update"
import { Express } from "express"

export default (host: Express) => {
    create(host)
    update(host)
    status(host)
}