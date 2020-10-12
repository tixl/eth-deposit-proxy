# Ethereum Deposit Proxy

## Purpose

Not every user has the ability to sign arbitrary things as needed with his ethereum wallet. To verify, that the claimed
ETH transaction belongs to the user creating the Tixl Deposit block, the users needs to sign the public key of the chain
the Tixl block is deposited on with his ETH private key and provide that signature to the Tixl deposit block.

This service will create disposable ETH addresses and create the signature on the users behalf.

## Installation

A JSON configuration object `.config.json` complient with the following interface must be provided:
```
{
    server: string // url to Geth server, e.g. "http://207.154.253.13:8545"
    address: string // where the money is sent to (pool address), e.g.: "0x0dF22FdeD1D944365B6561B7a620a48E3f4D3CCe"
    key: string // signing key (hex encoded private key)
}
```

## Interface

The service exposes a HTTP API:

Core API:

```
POST /create
    request body: context (hex string)
        Context is any string unique to the wallet owner (e.g.: chainSigPubKey)
    response body: string
        Returns address. The address is added to the database of tracked addresses
```

```
GET /status/:address (string)
    response body: { confirmations: int, transaction: string }
        Transaction may be an empty string if transaction to the pool address has not been created yet.
        Confirmations is the number of confirmations since the last balance change of the address.
```

Extra API (may not be needed):

```
GET /sign/:message (hex string)
    response body: signature (hex string)
        Return signature for the given message. Is this needed at all?
```

Debug API:

```
POST /update
    notes: This triggers the scan of all addresses. Only for debugging purposes (in production scans can be
    triggered automatically).
```

```
POST /collect
    request body: address (string)
    notes: This will transfer money from the generated address to the single pool address. The trsansaction hash will be
    stored in the database and reported in future /status calls. Only for debugging purposes (in production collects can
    be automatic).
```

POST /create body: {chainSigPubKey: string} returns JSON {address: string, signature: string}

GET /status/:InTxHash {outHash: string, incConfirmations: number, outConfirmations: number}

```
POST /update
    body: {balance?: string, confirmations?: int}
    returns: {address: string, balance: string, confirmations: int}[]
```

Will scan over all created addresses and for each address and:
1. determine the current balance of address
2. check if the current balance equals to the balance at the last scan:
    - if equals, do nothing
    - if not, save the current balance and the current block height to the database record

The method will return the array of addresses (together with balances and confirmations) that:
1. have at least the specified balance
2. have at least the specified number of confirmations

## Method lifecycle
When the /create endpoint is called the service creates a new address and holds the private key. It signs `chainSigPubKey` which is an ASCII string with the private key and returns the address and the signature.

The service saves the address and privateKey in a database (Sqlite, encrypted)*

When the /status endpoint is called for the first time with a transactionHash the service starts to monitor that transaction, until it has enough confirmations to be deemed accepted. Then the service creates an transaction to the pool address (from env var) and saves the association of the out transaction with the incoming transaction.

The /status endpoint reports how many confirmations it has seen for the incoming transaction (incConfirmations, 0 if no transaction witnessed) and same for the outgoing transaction, so that the consumer (wallet) can check if the deposit transaction is already valid. Also the hash for the transaction that was created (outgoing) is reported.


*Alternative: The addresses are created from a HD wallet and the master private key is passed to the service on start, so only the address and HD path have to be saved.

## Code organization

There are two implementations:
1. Standard implementation: works as designed, addresses and corresponding keys are created on demand.
2. Experimental implementation: (only in `src/experimental`) contract-based implementation (it has one security benefit:
    funds can ONLY be sent to the pool address, sending to any other address is not possible).

## Misc
- Ask us if you don’t understand how something should work
- Only implement what’s in the specification. If you need to update the specification please chat with us before.
- Use environment variables for configuration