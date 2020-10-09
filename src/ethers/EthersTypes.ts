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
    readonly signable: readonly [Signable] | readonly []
    readonly signed: readonly [Signed] | readonly []
}

export interface Input extends Types.Input {
    readonly nonce: int
    readonly gasLimit: Natural
    readonly gasPrice: Natural
    readonly data: string
    readonly chain: int
}

export interface Output extends Types.Output {
}

export interface Signable extends Types.Signable {
    readonly signers: readonly [string]
}

export interface Signed extends Types.Signed {
    readonly signatures: readonly [Signature]
}

export interface Signature extends Types.Signature {
}

export interface Key<T extends Public | Private> extends Types.Key<T> {
}

export type Public = Types.Public
export type Private = Types.Private