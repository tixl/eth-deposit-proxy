import solc from "solc"
import { ethers } from "ethers"
import { bytes } from "../core/Core"

class Compiler {
    static compile(code: string): Compiler.Result {
        let s = {
            language: "Solidity",
            settings: { outputSelection: {"*": { "*": ["abi", "evm.bytecode.object"] } } },
        } as const
        let t = {
            ...s,
            sources: { main: { content: code } },
        } as import("solc").Input
        let r = JSON.parse(solc.compile(JSON.stringify(t))) as import("solc").Output
        return r.contracts?.main ? _convert(r.contracts.main) : {}
    }
}

namespace Compiler {
    export interface Module {
        readonly abi: readonly object[]
        readonly bytecode: Bytes
    }

    export interface Result {
        readonly [contract: string]: Module | void
    }
}

function _convert(main: { readonly [name: string]: import("solc").Contract }): Compiler.Result {
    let t = {} as { [contract: string]: Compiler.Module | void }
    for (let i of Object.entries(main)) t[i[0]] = {
        abi: i[1].abi || [],
        bytecode: i[1].evm?.bytecode?.object ? ethers.utils.arrayify(`0x${i[1].evm?.bytecode?.object}`) : bytes(),
    }
    return t
}

export default Compiler