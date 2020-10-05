/** Assert the object, converted to boolean, evaluates to true. */
export function assert<Type>(value: Type): asserts value {
    if (!value) throw new Error("Assertion failed")
}

/** Assert the parameter is an integer and return it. */
export function int(value: int): int {
    assert(Number.isSafeInteger(value))
    return value
}

/** Assert the parameter is an unsigned integer and return it. */
export function unsigned(value: int): int {
    assert(int(value) >= 0)
    return value
}

/** Check if the value is defined. */
export function is<Type>(value: Type): value is Exclude<Type, void>
/** Check if the value is of the specified type. */
export function is<Type>(value: unknown, type: new(...x: any[]) => Type): value is Type
export function is<Type>(value: unknown, type?: new(...x: any[]) => Type): value is Type | Exclude<Type, void> {
    if (!type) return value != null
    return value != null && ((value as object).constructor == type || value instanceof type)
}

/** Asserts the value is defined. */
export function as<Type>(value: Type): Exclude<Type, void>
/** Assert the value is of the specified type. */
export function as<Type>(value: unknown, type: new(...x: any[]) => Type): Type
export function as<Type>(value: unknown, type?: new(...x: any[]) => Type): Type | Exclude<Type, void> {
    assert(type ? is(value, type) : is(value))
    return value as Type | Exclude<Type, void>
}

/** Potentially evaluates the provided parameter and returns the result. */
export function apply<Type>(value: Type | (() => Type)): Type
/** Evaluates the provided function with supplied parameters. */
export function apply<Type, Input extends any[]>(value: (...input: Input) => Type, ...input: Input): Type
export function apply<Type, Input extends any[]>(value: Type | ((...input: Input) => Type), ...input: Input): Type {
    return is(value, Function) ? value(...input) : value
}