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

class Settings {
  // Geth (or compatible) server
  readonly server = "" as string

  // address used by validators
  readonly address = "" as string

  // mnemonic for mock signing service
  readonly mnemonic = "" as string // for local testing only, won't be used in production
}

bind(Settings, JSON.parse(require("fs").readFileSync(".config.json").toString()) as Settings)
bind(EthersProvider, new EthersProvider(inject(Settings).server))
/** NOTE: this is a signer for local wallet (using menemonic). It should be replaced with signing service:
  * `bind(EthersSigner, new EthersSigner(async (dataToSign: Bytes) => returnSignedDataAsBytes(dataToSign))) */
bind(EthersSigner, EthersSigner.from(inject(Settings).mnemonic))

; (async () => {
    const app = express()
    app.use(express.json())
    const port = process.env.PORT || 4000
    app.listen(port)
    console.log(`Service listening on port ${port}`)

    let db = await RocksDBStore.create("data")
    bind(Store, new Store(db))
    bind(Service, new Service(ethers.utils.arrayify(ethers.Wallet.fromMnemonic(inject(Settings).mnemonic).privateKey), inject(Settings).address))
    api(app)
})()