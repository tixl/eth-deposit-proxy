declare module "solc" {
    export function compile(input: string): string

    export interface Input {
        readonly language: "Solidity"
        readonly sources: {
            readonly [path: string]: {
                readonly keccak256?: string
                readonly urls?: readonly string[]
                readonly content?: string
            }
        }
        readonly settings?: {
            readonly remappings?: readonly string[],
            readonly optimizer?: {
                readonly enabled?: boolean
                readonly runs?: int
                readonly details?: {
                    readonly peephole?: boolean
                    readonly jumpdestRemover?: boolean
                    readonly orderLiterals?: boolean
                    readonly deduplicate?: boolean
                    readonly cse?: boolean
                    readonly constantOptimizer?: boolean
                    readonly yul?: boolean
                    readonly yulDetails?: {
                        readonly stackAllocation?: boolean
                        readonly optimizerSteps?: string
                    }
                }
            }
            readonly evmVersion?: string
            readonly debug?: {
                readonly revertStrings?: "default" | "strip" | "debug" | "verboseDebug"
            }
            readonly metadata?: {
                readonly useLiteralContent?: boolean
                readonly bytecodeHash?: "none" | "ipfs" | "bzzr1"
            }
            readonly libraries?: {
                readonly [path: string]: {
                    readonly [name: string]: string
                }
            }
            readonly outputSelection?: {
                readonly [path: string]: {
                    readonly [contract: string]: readonly (
                        | "ast"
                        | "legacyAST"
                        | "abi"
                        | "devdoc"
                        | "userdoc"
                        | "metadata"
                        | "ir"
                        | "irOptimized"
                        | "storageLayout"
                        | "evm.assembly"
                        | "evm.legacyAssembly"
                        | "evm.bytecode.object"
                        | "evm.bytecode.opcodes"
                        | "evm.bytecode.sourceMap"
                        | "evm.bytecode.linkReferences"
                        | "evm.deployedBytecode"
                        | "evm.deployedBytecode.immutableReferences"
                        | "evm.methodIdentifiers"
                        | "evm.gasEstimates"
                        | "ewasm.wast"
                        | "ewasm.wasm"
                    )[]
                }
            }
        }
    }

    export interface Output {
        readonly errors?: readonly {
            readonly sourceLocation?: {
                readonly file: string
                readonly start: int
                readonly end: int
            }
            readonly type:
                | "JSONError"
                | "IOError"
                | "ParserError"
                | "DocstringParsingError"
                | "SyntaxError"
                | "DeclarationError"
                | "TypeError"
                | "UnimplementedFeatureError"
                | "InternalCompilerError"
                | "Exception"
                | "CompilerError"
                | "FatalError"
                | "Warning"
            readonly component: string
            readonly severity: "error" | "warning"
            readonly message: string
            readonly formattedMessage?: string
        }[]
        readonly sources?: {
            readonly [path: string]: {
                readonly id: int
                readonly ast?: object
                readonly legacyAST?: object
            }
        }
        readonly contracts?: {
            readonly [path: string]: {
                readonly [contract: string]: Contract
            }
        }
    }

    export interface Contract {
        readonly abi?: readonly object[]
        readonly metadata?: string
        readonly userdoc?: object
        readonly devdoc?: object
        readonly ir?: string
        readonly evm?: {
            readonly assembly?: string
            readonly legacyAssembly?: object
            readonly bytecode?: Bytecode
            readonly deployedBytecode?: Bytecode
            readonly methodIdentifiers?: {
                readonly [name: string]: string
            }
            readonly gasEstimates?: {
                readonly creation?: {
                    readonly codeDepositCost?: string
                    readonly executionCost?: string
                    readonly totalCost?: string
                }
                readonly external?: {
                    readonly [name: string]: string
                }
                readonly internal?: {
                    readonly [name: string]: string
                }
            }
        }
        readonly ewasm?: {
            readonly wast?: string
            readonly wasm?: string
        }
    }

    export interface Bytecode {
        readonly object: string
        readonly opcodes: string
        readonly sourceMap: string
        readonly linkReferences?: {
            readonly [path: string]: {
                readonly [contract: string]: readonly {
                    readonly start: int
                    readonly length: int
                }[]
            }
        }
    }
}