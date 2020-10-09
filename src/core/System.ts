import { is } from "./Core"

export class Scope {
    static readonly root = new Scope

    static do<Type>(scope: Scope, action: () => Type): Type {
        let s = Scope as { root: Scope }
        let t = s.root
        s.root = scope
        let r = action()
        s.root = t
        return r
    }

    constructor(owner?: Scope) {
        let t = (owner || Scope.root) as Scope | void
        this._map = t ? new Map(t._map) : new Map
    }

    bind<Type extends object>(type: Type, to?: Scope.Provider<Type>): void {
        if (to) this._map.set(type, to)
        else this._map.delete(type)
    }

    inject<Type extends object>(type: Type, fail?: Scope.Provider<Type>): Scope.Instance<Type> {
        let t = this._map.get(type) as Scope.Provider<Type> | void
        if (t) return is(t, Function) ? t() : t
        if (fail) return is(fail, Function) ? fail() : fail
        return is(type, Function) ? type() : type
    }

    private _map: Map<object, object>
}

export namespace Scope {
    export type Instance<Type> = Type extends new (...p: infer _Parameters) => infer Result ? Result : Type
    export type Provider<Type> = Instance<Type> | (() => Instance<Type>)
}

export function inject<Type extends object>(type: Type, fail?: Scope.Provider<Type>): Scope.Instance<Type> {
    return Scope.root.inject(type, fail)
}

export function bind<Type extends object>(type: Type, to?: Scope.Provider<Type>): void {
    Scope.root.bind(type, to)
}