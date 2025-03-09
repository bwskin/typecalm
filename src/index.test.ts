import { describe, test, expect } from 'vitest'

import {
    number,
    boolean,
    string,
    array,
    object,
    nullable,
    optional,
    toNumber,
    toString,
    toBoolean,
    stringBoolean,
    is,
    derive
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
})
