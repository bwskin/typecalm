export type TypeGuard<T> = (val: unknown) => T;

//
// Error messages
//

const invalidType = (value: unknown, type: string) => {
    return `\`${JSON.stringify(value)}\` is not ${type}.`
}

const castingType = (value: unknown, type: string) => {
    return `Casting \`${JSON.stringify(value)}\` to ${type}.`
}

const casing = {
    snakeCase: {
        toCamelCase: (str: string) => {
            return str.replace(/([_][a-z1-9])/ig, (group: string) => {
                return group.toUpperCase()
                    .replace('_', '');
            });
        }
    }
}

export const TypeCalm = ({ customErrorHandler }: { customErrorHandler?: (e: any) => void } = {}) => {

    //
    // Error handling
    //

    // Force default error handler (for is() function)
    let forceError = false

    // By default throw an error
    const defaultErrorHandler = (str: string) => {
        throw new Error(str)
    }

    const errorHandler = (str: string) => {
        if (forceError || !customErrorHandler) return defaultErrorHandler(str)
        customErrorHandler(str)
    }

    //
    // Basic validators
    //

    const string: TypeGuard<string> = (val: unknown) => {
        if (typeof val !== 'string') {
            errorHandler(invalidType(val, "a `string`"))
            errorHandler(castingType(val, "a `string`"))
            return String(val)
        }
        return val;
    }

    const number: TypeGuard<number> = (val: unknown) => {
        if (typeof val !== 'number') {
            errorHandler(invalidType(val, "a `number`"))
            errorHandler(castingType(val, "a `number`"))
            return Number(val)
        }
        if (val !== val) errorHandler(`"${val}" is a NaN`)
        return val;
    }

    const boolean: TypeGuard<boolean> = (val: unknown) => {
        if (typeof val !== 'boolean') {
            errorHandler(invalidType(val, "a `boolean`"))
            errorHandler(castingType(val, "a `boolean`"))
            return Boolean(val)
        }
        return val;
    }

    const array = <T>(inner: TypeGuard<T>) => (val: unknown): T[] => {
        if (!Array.isArray(val)) {
            errorHandler(invalidType(val, 'an `array`'));
            errorHandler(`Wrapping "${val}" in array`);
            return [val].map(inner)
        }
        return val.map(inner);
    }

    const object = <T extends Record<string, TypeGuard<any>>>(inner: T) => {
        return (val: unknown): { [P in keyof T]: ReturnType<T[P]> } => {
            if (val === null || typeof val !== 'object') {
                errorHandler(invalidType(val, 'an `object`'));
                errorHandler(`Cannot cast \`${JSON.stringify(val)}\` to object. Fingers crossed it's not important.`);
                return val as { [P in keyof T]: ReturnType<T[P]> }
            }
            const out: { [P in keyof T]: ReturnType<T[P]> } = {} as any;

            for (const k in inner) {
                let skipCleanup = forceError
                try {
                    forceError = true
                    out[k] = inner[k]((val as any)[k])
                } catch (e) {
                    if (!skipCleanup) forceError = false
                    errorHandler(`Object '${k}' property error: ${(e as Error).message}`)
                    out[k] = (val as any)[k]
                } finally {
                    if (!skipCleanup) forceError = false
                }
            }

            return out
        }
    }

    const recordOf = <T>(inner: TypeGuard<T>) => {
        return (val: unknown): {[key: string]: T} => {
            if (val === null || typeof val !== 'object') {
                errorHandler(invalidType(val, 'an `object`'));
                errorHandler(`Cannot cast \`${JSON.stringify(val)}\` to object. Fingers crossed it's not important.`);
                return val as {[key: string]: T}
            }
            const out = {}

            for (const k in val) {
                // @ts-ignore
                out[k] = inner(val[k] as any)
            }

            return out
        }
    }

    // 
    // Optional modifiers
    //

    const nullable: <T>(inner: TypeGuard<T>) => TypeGuard<T | null> = (inner) => (val: unknown) => {
        if (val === null) return val
        else return inner(val)
    }

    const optional: <T>(inner: TypeGuard<T>) => TypeGuard<T | undefined> = (inner) => (val: unknown) => {
        if (typeof val === 'undefined') return val
        else return inner(val)
    }

    const either: <T, U>(inner1: TypeGuard<T>, inner2: TypeGuard<U>) => TypeGuard<T | U> = (inner1, inner2) => (value: unknown) => {
        const errors = []
        let skipCleanup = forceError
        let ok = false
        forceError = true

        type R = (ReturnType<typeof inner1> | ReturnType<typeof inner2>)

        try {
            inner1(value)
            ok = true
        } catch (e) {
            errors.push(e)
            try {
                inner2(value)
                ok = true
            } catch (e) {
                errors.push(e)
            }
        } finally {
            if (!skipCleanup) forceError = false
            if (!ok) {
                errors.forEach(e => errorHandler(String(e)))
            }
            return value as R
        }
    }

    //
    // Converters
    //
    
    const stringBoolean: TypeGuard<boolean> = (val: unknown) => {
        if (typeof val === 'boolean') return val
        if (typeof val === "string") {
            if (val === "true") return true
            else if (val === "false") return false
            else errorHandler(`"${val}" is not "true" or "false" string`)
        } else {
            errorHandler(`"${val}" is not "true" or "false" string`)
        }
        return Boolean(val)
    }

    const toBoolean: TypeGuard<boolean> = (val: unknown) => {
        return Boolean(val)
    }

    const toNumber: TypeGuard<number> = (val: unknown) => {
        let parsed = Number(val)
        if (parsed !== parsed) errorHandler(`"Number(${val})" is NaN`)
        return parsed
    }

    const toString: TypeGuard<string> = (val: unknown) => {
        return String(val)
    }

    // Checker

    const is = <T>(value: unknown, typeguard: TypeGuard<T>): value is T => {
        // Since is() can technically be called inside callback passed
        // to it another is() call, we should check if forceError is
        // already set and then prevent it from cleaning early
        let skipCleanup = forceError
        try {
            forceError = true
            typeguard(value)
            return true
        } catch (e) {
            return false
        } finally {
            if (!skipCleanup) forceError = false
        }
    }

    const oneOf = <const T extends readonly unknown[]>(...values: T) => (value: unknown): T[number] => {
        if (values.includes(value as T)) return value as T[number]
        errorHandler(invalidType(value, `one of ${values}`))
        value as unknown as T[number]
    }

    const as = <T>(guard: TypeGuard<T>) => <U extends T>(value: unknown) => guard(value) as U

    const enumMember = <T>(enumType: T) => (value: unknown): T[keyof T]  => {
        const isEnumItem = Object.keys(enumType as {}).map(key => enumType[key as keyof T]).includes(value as T[keyof T])
        if (isEnumItem) return value as T[keyof T]
        errorHandler(invalidType(value, 'a member of passed enum'))
        return value as unknown as T[keyof T]
    }

    //
    // Decorators
    //

    const mapper = (statements: Record<string, (arg: any) => any >) => (value: {[key: string]: unknown}) => {
        const mapped: Record<string, unknown> = {}
        for (const name in statements) {
            try {
                mapped[name] = statements[name](value)
            } catch (e) {
                errorHandler(`Cannot map \`${name}\`: ${e}`)
                errorHandler(`Skipping \`${name}\`. Fingers crossed it's not important.`)
                mapped[name] = undefined
            }
        }
        return {
            ...value,
            ...mapped
        }
    }

    const rename = (statements: Record<string, string>) => (value: {[key: string]: unknown}) => {
        const mapped: Record<string, unknown> = {}
        for (const name in value) {
            const newName = statements[name]
            if (newName) {
                mapped[newName] = value[name]
            } else {
                mapped[name] = value[name]
            }
        }
        return mapped
    }

    const renameCase = {
        snake: {
            toCamel: (value: {[key: string]: unknown}) => {
                const statements: {[key: string]: string} = {}
                for (const name in value) {
                    statements[name] = casing.snakeCase.toCamelCase(name)
                }
                return rename(statements)(value)
            }
        }
    }

    const decorate = <T>(typeguard: TypeGuard<T>, mapper: any) => (value: unknown): T => typeguard(mapper(value))

    return {
        number,
        boolean,
        string,
        array,
        object,
        recordOf,
        nullable,
        optional,
        toNumber,
        toString,
        toBoolean,
        stringBoolean,
        either,
        is,
        oneOf,
        enumMember,
        as,
        rename,
        renameCase,
        mapper,
        decorate
    }
}

export const {
    number,
    boolean,
    string,
    array,
    object,
    recordOf,
    nullable,
    optional,
    toNumber,
    toString,
    toBoolean,
    stringBoolean,
    either,
    is,
    rename,
    oneOf,
    enumMember,
    as,
    renameCase,
    mapper,
    decorate
} = TypeCalm()
