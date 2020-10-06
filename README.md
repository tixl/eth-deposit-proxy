# Ethereum Deposit Proxy

## Purpose

Not every user has the ability to sign arbitrary things as needed with his ethereum wallet. To verify, that the claimed
ETH transaction belongs to the user creating the Tixl Deposit block, the users needs to sign the public key of the chain
the Tixl block is deposited on with his ETH private key and provide that signature to the Tixl deposit block.

This service will create disposable ETH addresses and create the signature on the users behalf.

## Interface

The service exposes a HTTP API:

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

## Misc
- Ask us if you don’t understand how something should work
- Only implement what’s in the specification. If you need to update the specification please chat with us before.
- Use environment variables for configuration