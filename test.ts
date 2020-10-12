/// <reference types="./src" />
import express from 'express'
import { inject, bind } from "./src/core/System"
import EthersProvider from './src/ethers/EthersProvider'
import EthersSigner from './src/ethers/EthersSigner'
import api from "./src/api"
import Store from './src/storage/Store'
import RocksDBStore from './src/implementations/rocksdb/RocksDBStore'
import Service from './src/api/Service'
import { ethers } from 'ethers'
import Data from './src/data/Data'
import { Hex } from './src/ethers/EthersTools'
import { Key } from './src/ethers/EthersTypes'
import Settings from "./src/Settings"

bind(Settings, JSON.parse(require("fs").readFileSync(".config.json").toString()) as Settings)
bind(EthersProvider, new EthersProvider(inject(Settings).server))
/** NOTE: this is a signer for local wallet (using menemonic). It should be replaced with signing service:
  * `bind(EthersSigner, new EthersSigner(async (dataToSign: Bytes) => returnSignedDataAsBytes(dataToSign))) */
// bind(EthersSigner, EthersSigner.from(Hex.decode(inject(Settings).key) as Key.Private))

; (async () => {
    const app = express().use(express.json())
    const port = process.env.PORT || 4000
    app.listen(port)
    console.log(`Service listening on port ${port}`)

    let key = Hex.decode(inject(Settings).key) as Key.Private
    bind(Store, new Store(await RocksDBStore.create()))
    bind(Service, new Service(key, inject(Settings).address))
    api(app)
})()