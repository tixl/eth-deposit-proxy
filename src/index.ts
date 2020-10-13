/// <reference types="." />
import { inject, bind } from "./core/System"
import EthersProvider from './ethers/EthersProvider'
import Store from './storage/Store'
import RocksDBStore from './implementations/rocksdb/RocksDBStore'
import Service from './api/Service'
import Settings from './Settings'
import { Hex } from './ethers/EthersTools'
import { Key } from './ethers/EthersTypes'

; (async () => {
    bind(Settings, JSON.parse(require("fs").readFileSync(".config.json").toString()) as Settings)
    bind(EthersProvider, new EthersProvider(inject(Settings).server))

    let key = Hex.decode(inject(Settings).key) as Key.Private
    bind(Store, new Store(await RocksDBStore.create()))
    bind(Service, new Service(key, inject(Settings).address))
})()