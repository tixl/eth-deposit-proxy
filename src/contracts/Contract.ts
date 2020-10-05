import Compiler from "./Compiler"
import EthersWallet from "../ethers/EthersWallet"
import { ethers } from "ethers"

export default class Contract {
    static create(address: string, bytecode: Bytes, context: Bytes): string {
        let a = address
        let s = ethers.utils.arrayify(ethers.utils.keccak256(context))
        let b = ethers.utils.arrayify(ethers.utils.keccak256(bytecode))
        return ethers.utils.getCreate2Address(a, s, b)
    }

    static async deploy(module: Compiler.Module | void, signer: EthersWallet): Promise<string> {
        if (!module) return ""
        let t = module as Compiler.Module
        let f = new ethers.ContractFactory(t.abi as ethers.ContractInterface, t.bytecode, signer["_wallet"])
        return (await f.deploy()).address
    }

    static head(version?: string): string {
        return _head(version || "0.7.1")
    }

    static code(text: string): string {
        return text.trim().split(/\r?\n/).map(i => i.trimEnd()).join("\n")
    }
}

let _head = (version: string) => Contract.code(`
/// SPDX-License-Identifier: MIT
pragma solidity ${version};
`)