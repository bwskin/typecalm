import { describe, test, expect } from 'vitest'

import {
    number,
    boolean,
    string,
    either,
    array,
    object,
    nullable,
    optional,
    toNumber,
    toString,
    toBoolean,
    renameCase,
    stringBoolean,
    is,
} from './index'

describe('strict', () => {
    describe('number', () => {
        test('correctly passes numbers', () => {
            expect(number(4)).toBe(4)
        })
        test('throws error when passing nothing', () => {
            // @ts-ignore
            expect(() => number()).toThrowError()
        })
        test('throws error when passing string', () => {
            expect(() => number("4")).toThrowError()
        })
        test('throws error when passing boolean', () => {
            expect(() => number(true)).toThrowError()
        })
        test('throws error when passing object', () => {
            expect(() => number({})).toThrowError()
        })
        test('throws error when passing array', () => {
            expect(() => number([4])).toThrowError()
        })
    })
    describe('object', () => {
        test('correctly passes subguards', () => {
            const testValue = {
                obj: {
                    num: 4,
                    str: 'str',
                    numarr: [1, 2, 3]
                },
                num: 4,
                str: 'str',
                numarr: [1, 2, 3]
            }
            expect(object({
                obj: object({
                    num: number,
                    str: string,
                    numarr: array(number)
                }),
                num: number,
                str: string,
                numarr: array(number)
            })(testValue)).toStrictEqual(testValue)
        })
        test('correctly fails subguards', () => {
            const failingTestValue = {
                obj: {
                    num: '4',
                    str: 4,
                    numarr: ['a', 'b']
                },
                num: '4',
                str: 4,
                numarr: ['a', 'b']
            }
            expect(() => object({
                obj: object({
                    num: number,
                    str: string,
                    numarr: array(number)
                }),
                num: number,
                str: string,
                numarr: array(number)
            })(failingTestValue)).toThrow("Object 'obj' property error: Object 'num' property error: `\"4\"` is not a `number`.")
        })
    })
})
describe('either', () => {
    test('correctly passes numbers and strings', () => {
        const guard = either(number, string)
        expect(guard(4)).toBe(4)
        expect(guard("4")).toBe("4")
    })
    test('correctly passes numbers, number arrays, strings and booleans (nesting), fails at array of strings', () => {
        const guard = 
            either(number, 
            either(array(number), 
            either(boolean,
                   string
            )))
        expect(guard(4)).toBe(4)
        expect(guard([4])).toStrictEqual([4])
        expect(guard("4")).toBe("4")
        expect(() => guard(["4"])).toThrow()
        expect(guard(true)).toBe(true)
    })
})
describe('renameCase', () => {
    test('rename snake case to camel case', () => {
        expect(renameCase.snake.toCamel({
            project_id: 20,
            category_id: 40,
            date_of_creation: "2025-10-2"
        })).toStrictEqual({
                categoryId: 40,
                dateOfCreation: "2025-10-2",
                projectId: 20,
            })
    })
})
