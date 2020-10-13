/// <reference types="." />

/** Wallet interface (can be remote signer). */
export interface Wallet extends Signer {
    /** List of addresses in the wallet (the list returned is not guaranteed to be commlete, so additional calls to
      * list(lastKnownAddress) are required). */
    addresses(afterAddress?: string): Promise<readonly string[]>

    /** Balance of the address (if provided), or balance of all addresses in the wallet (if address is missing). */
    balance(address?: string): Promise<Natural>

    /** Prepare a fund for sending. The amount is in smallest unit (e.g. satoshi, wei, ...). */
    send(amount: Natural, priority?: float): Promise<Fund>

    /** Generate a new address for receiving (optionally skip a specified number of addresses). */
    receive(skipAddresses?: int): Promise<string>

    /** Return the public key of the signer. */
    key(signer: string): Promise<Key.Public>
}

/** Signature service. */
export interface Signer {
    /** Sign the provided data. */
    sign(data: Signing.Signable): Promise<Signing.Signature>
}

/** Signature verifier. */
export interface Verifier {
    /** Verify the provided digest and signature. */
    verify(data: Signing.Signable, signature: Signing.Signature): boolean
}

/** Provider interface (e.g. geth). */
export interface Provider {
    /** Block height. */
    readonly blocks: int

    /** Update the state (currently only number of blocks). */
    update(): Promise<void>

    /** List of transaction hashes.included in a given block */
    block(block: int): Promise<readonly string[]>

    /** Balance of address. */
    balance(address: string): Promise<Natural>

    /** Sends the transaction, returns txid. */
    send(transaction: Transaction): Promise<string>

    /** List of transactions to/from address. (the list returned is not guaranteed to be commlete, so additional calls
      * to list(lastKnownAddress) are required). NOTE: may not be supported. */
    poll(address: string, afterTransaction?: string): Promise<readonly string[]>

    /** Get the payment information given the txid. Some light nodes may require block number (or block hash). */
    transaction(hash: string, block?: int | string): Promise<Payment>
}

export interface Payment {
    readonly transaction: Transaction
    readonly confirmations: int
}

export interface Fund {
    readonly inputs: readonly Input[]
    readonly fee: Natural
    readonly priority: float
    readonly change: string
}

export interface Input {
    readonly from: string
    readonly value: Natural
}

export interface Output {
    readonly to: string
    readonly value: Natural
}

export interface Transaction {
    readonly from: readonly Input[]
    readonly to: readonly Output[]
    readonly signable: readonly Signing.Signable[]
    readonly signed: readonly Signed[]
}

export interface Signed {
    readonly data: Bytes
    readonly signatures: readonly Signing.Signature[]
}

export namespace Signing {
    export type Signable = Bytes & { readonly "": "Signable" }
    export type Signature = Bytes & { readonly "": "Signature" }
    export type Digest = Bytes & { readonly "": "Digest" }
    export type Signer = Bytes & { readonly "": "Signer" }
}

export namespace Key {
    export type Public = Bytes & { readonly "": "Public" }
    export type Private = Bytes & { readonly "": "Private" }
}