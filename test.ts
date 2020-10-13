/// <reference types="./src" />
import { inject, bind } from "./src/core/System"
import EthersProvider from './src/ethers/EthersProvider'
import Store from './src/storage/Store'
import RocksDBStore from './src/implementations/rocksdb/RocksDBStore'
import Service from './src/api/Service'
import { Hex } from './src/ethers/EthersTools'
import { Key } from './src/ethers/EthersTypes'
import Settings from "./src/Settings"
import Public from "./src/api/Public"

bind(Settings, JSON.parse(require("fs").readFileSync(".config.json").toString()) as Settings)
bind(EthersProvider, new EthersProvider(inject(Settings).server))

; (async () => {
    let key = Hex.decode(inject(Settings).key) as Key.Private
    bind(Store, new Store(await RocksDBStore.create()))
    bind(Service, new Service(key, inject(Settings).address))
    bind(Public, new Public)
})()