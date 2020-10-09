/// <reference types="." />

/** Wallet interface (can be remote signer). */
export interface Wallet {
    /** List of addresses in the wallet (the list returned is not guaranteed to be commlete, so additional calls to
      * list(lastKnownAddress) are required). */
    addresses(afterAddress?: string): Promise<readonly string[]>

    /** Balance of the address (if provided), or balance of all addresses in the wallet (if address is missing). */
    balance(address?: string): Promise<Natural>

    /** Prepare a fund for sending. The amount is in smallest unit (e.g. satoshi, wei, ...). */
    send(amount: Natural, priority?: float): Promise<Fund>

    /** Generate a new address for receiving (optionally skip a specified number of addresses). */
    receive(skipAddresses?: int): Promise<string>

    /** Sign provided data. */
    sign(data: Signable): Promise<Signed>

    /** Return the public key of the signer. */
    key(signer: string): Promise<Key<Public>>
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
    readonly signable: readonly Signable[]
    readonly signed: readonly Signed[]
}

export interface Signable {
    readonly data: Bytes
    readonly signers: readonly string[]
}

export interface Signed {
    readonly data: Bytes
    readonly signatures: readonly Signature[]
}

export interface Signature {
    readonly data: Bytes
    readonly signer: Signer
}

export interface Signer {
    readonly name: string
    readonly key: Key<Public>
}

export interface Key<T extends Public | Private> {
    readonly type: T
    readonly data: Bytes
}

export type Public = "Public"
export type Private = "Private"