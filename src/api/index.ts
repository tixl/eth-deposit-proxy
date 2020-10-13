import create from "./create_old"
import status from "./status_old"
import update from "./update"
import { Express } from "express"

export default (host: Express) => {
    create(host)
    update(host)
    status(host)
}