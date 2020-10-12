import * as Types from "../types"

export interface Wallet extends Types.Wallet {
    send(amount: Natural, priority?: float): Promise<Fund>
}

export interface Provider extends Types.Provider {
    send(transaction: Transaction): Promise<string>
    transaction(hash: string): Promise<Payment>
}

export interface Payment extends Types.Payment {
    readonly transaction: Transaction
}

export interface Fund extends Types.Fund {
    readonly inputs: readonly [Input]
}

export interface Transaction extends Types.Transaction {
    readonly from: readonly [Input]
    readonly to: readonly [Output]
    readonly signable: readonly [Signing.Signable] | readonly []
    readonly signed: readonly [Signed] | readonly []
    readonly nonce: int
    readonly gas: { readonly limit: Natural, readonly price: Natural }
    readonly data: string
    readonly chain: int
}

export interface Input extends Types.Input {
}

export interface Output extends Types.Output {
}

export interface Signed extends Types.Signed {
    readonly signatures: readonly [Signing.Signature]
}

export import Signing = Types.Signing
export import Key = Types.Key