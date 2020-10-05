import { bytes } from "../core/Core"
import { inject } from "../core/System"
import Collector from "../contracts/Collector"
import Receiver from "../contracts/Receiver"
import Writer from "../data/Writer"
import EthersProvider from "../ethers/EthersProvider"
import Store from "../storage/Store"
import Reader from "../data/Reader"
import { ethers } from "ethers"

export default class Service {
    constructor(key?: Bytes) {
        if (key?.length) this._key = key
    }

    get block(): int {
        return this._n
    }

    sign(data: Bytes): Bytes {
        let t = new ethers.utils.SigningKey(this._key)
        return ethers.utils.arrayify(ethers.utils.joinSignature(t.signDigest(ethers.utils.keccak256(data))))
    }

    receive(key: Bytes): string {
        return this._receiver.receive(Writer.packed([this._key, key]))
    }

    async wait(): Promise<void> {
        for (let i = await this._block(); true; i = await this._block()) if (i != this.block) {
            this._n = i
            return
        }
    }

    async start(): Promise<never> {
        while (true) {
            await this.wait()
            await this.scan()
        }
    }

    async add(key: Bytes): Promise<void> {
        let t = Writer.packed([bytes([0, 0]), key])
        if (await this._data.get(t)) return
        let n = await this._data.get(bytes())
        await this._data.batch([[t, n], [n, t], [bytes(), Writer.unsigned(Reader.unsigned(n).value + 1)]])
    }

    async balance(key: Bytes): Promise<Natural> {
        return await this._provider.balance(this.receive(key))
    }

    async scan(): Promise<void> {
        for await (let i of await this._data.range(bytes([0, 0]))) {
            let t = i[0].subarray(2)
            // await this._scan(t)
        }
    }

    private async _block(): Promise<int> {
        return await this._provider["_provider"].getBlockNumber()
    }

    private _collector = inject(Collector)
    private _receiver = inject(Receiver)
    private _provider = inject(EthersProvider)
    private _data = inject(Store)
    private _key = bytes()
    private _n = 0
}

function _equal(a: Bytes, b: Bytes): boolean {
    if (a.length != b.length) return false
    let n = a.length
    for (let i = 0; i < n; i++) if (a[i] != b[i]) return false
    return true
}