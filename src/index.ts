/// <reference types="." />
import express from 'express'
import { inject, bind } from "./core/System"
import EthersProvider from './ethers/EthersProvider'
import EthersSigner from './ethers/EthersSigner'
import api from "./api"
import Store from './storage/Store'
import RocksDBStore from './implementations/rocksdb/RocksDBStore'
import Service from './api/Service'
import { ethers } from 'ethers'
import Settings from './Settings'
import { Hex } from './ethers/EthersTools'
import { Key } from './ethers/EthersTypes'

bind(Settings, JSON.parse(require("fs").readFileSync(".config.json").toString()) as Settings)
bind(EthersProvider, new EthersProvider(inject(Settings).server))
/** NOTE: this is a signer for local wallet (using menemonic). It should be replaced with signing service:
  * `bind(EthersSigner, new EthersSigner(async (dataToSign: Bytes) => returnSignedDataAsBytes(dataToSign))) */
// bind(EthersSigner, EthersSigner.from(Hex.decode(inject(Settings).key) as Key.Private))

const app = express()
app.use(express.json())

; (async () => {
    let key = Hex.decode(inject(Settings).key) as Key.Private
    let db = await RocksDBStore.create()
    bind(Store, new Store(db))
    bind(Service, new Service(key, inject(Settings).address))
    api(app)
})()

const port = process.env.PORT || 4000
app.listen(port)
console.log(`Service listening on port ${port}`)
