import * as backend from "./backend";
export declare abstract class Node {
    abstract readonly op: string;
    abstract toWast(indent: string): string;
}
export declare type StackType = "i32" | "i64" | "f32" | "f64";
/**
 * In memory representation of a WASM module.
 */
export declare class Module extends Node {
    readonly op: string;
    toWast(indent: string): string;
    /**
     * Returns the memory offset and the size of the UTF-8 encoding in bytes.
     */
    addString(value: string): [number, number];
    addBinary(value: Uint8Array): number;
    addFunction(f: Function): void;
    setInitFunction(f: Function): void;
    addFunctionImport(f: FunctionImport): void;
    importMemory(ns: string, obj: string): void;
    addGlobal(g: Global): void;
    addGlobalStruct(size: number): number;
    defineGlobalStruct(offset: number, arr: Uint8Array): void;
    textSize(): number;
    /**
     * Returns the name of the function type.
     */
    addFunctionType(params: Array<StackType>, results: Array<StackType>): string;
    addFunctionToTable(f: Function, index: number): void;
    static escapeName(name: string): string;
    memorySize: number;
    funcIndex: number;
    funcs: Array<Function>;
    funcTable: Array<Function>;
    funcTypes: Array<FunctionType>;
    funcImports: Array<FunctionImport>;
    exports: Map<string, Node>;
    initFunction: Function | null;
    private dataSize;
    private data;
    private memoryImport;
    private globals;
    private funcTypeByCode;
    private strings;
}
export declare class FunctionImport implements backend.FunctionImport {
    constructor(name: string, from: string, type: FunctionType);
    getIndex(): number;
    isImported(): boolean;
    name: string;
    from: string;
    type: FunctionType;
    index: number;
}
export declare class FunctionType {
    constructor(name: string, params: Array<StackType>, results: Array<StackType>);
    name: string;
    params: Array<StackType>;
    results: Array<StackType>;
}
export declare class Data extends Node {
    constructor(offset: number, value: Uint8Array);
    readonly op: string;
    toWast(indent: string): string;
    size(): number;
    protected uint8ToHex(x: number): string;
    offset: number;
    value: Uint8Array;
}
export declare class StringData extends Data {
    constructor(offset: number, value: Uint8Array);
    toWast(indent: string): string;
    size(): number;
}
export declare class Function extends Node implements backend.Function {
    constructor(name?: string);
    getIndex(): number;
    isImported(): boolean;
    readonly op: string;
    toWast(indent: string): string;
    name: string;
    index: number;
    parameters: Array<StackType>;
    locals: Array<StackType>;
    results: Array<StackType>;
    statements: Array<Node>;
    isInitFunction: boolean;
    isExported: boolean;
}
export declare class Constant extends Node {
    constructor(type: StackType, value: number);
    readonly op: string;
    toWast(indent: string): string;
    value: number;
    type: StackType;
}
export declare class Drop extends Node {
    readonly op: string;
    toWast(indent: string): string;
}
export declare class Select extends Node {
    readonly op: string;
    toWast(indent: string): string;
}
export declare type BinaryOp = "copysign" | "add" | "sub" | "mul" | "div" | "div_s" | "div_u" | "rem_s" | "rem_u" | "and" | "or" | "xor" | "shl" | "shr_u" | "shr_s" | "rotl" | "rotr" | "eq" | "ne" | "lt_s" | "lt_u" | "le_s" | "le_u" | "gt_s" | "gt_u" | "ge_s" | "ge_u" | "lt" | "gt" | "le" | "ge" | "min" | "max";
export declare class BinaryInstruction extends Node {
    constructor(type: StackType, op: BinaryOp);
    readonly op: string;
    toWast(indent: string): string;
    type: StackType;
    binaryOp: BinaryOp;
}
export declare type UnaryOp = "eqz" | "clz" | "ctz" | "popcnt" | "neg" | "abs" | "ceil" | "floor" | "trunc" | "nearest" | "sqrt";
export declare class UnaryInstruction extends Node {
    constructor(type: StackType, op: UnaryOp);
    readonly op: string;
    toWast(indent: string): string;
    type: StackType;
    unaryOp: UnaryOp;
}
export declare class Return extends Node {
    readonly op: string;
    toWast(indent: string): string;
}
export declare class GetLocal extends Node {
    constructor(index: number);
    readonly op: string;
    toWast(indent: string): string;
    index: number;
}
export declare class GetGlobal extends Node {
    constructor(index: number);
    readonly op: string;
    toWast(indent: string): string;
    index: number;
}
export declare class SetLocal extends Node {
    constructor(index: number);
    readonly op: string;
    toWast(indent: string): string;
    index: number;
}
export declare class TeeLocal extends Node {
    constructor(index: number);
    readonly op: string;
    toWast(indent: string): string;
    index: number;
}
export declare class SetGlobal extends Node {
    constructor(index: number);
    readonly op: string;
    toWast(indent: string): string;
    index: number;
}
export declare class Load extends Node {
    constructor(type: StackType, asType?: null | "8_s" | "8_u" | "16_s" | "16_u" | "32_s" | "32_u", offset?: number, align?: number | null);
    readonly op: string;
    toWast(indent: string): string;
    type: StackType;
    offset: number;
    asType: null | "8_s" | "8_u" | "16_s" | "16_u" | "32_s" | "32_u";
    align: number;
}
export declare class Store extends Node {
    constructor(type: StackType, asType?: null | "8" | "16" | "32", offset?: number, align?: number | null);
    readonly op: string;
    toWast(indent: string): string;
    type: StackType;
    offset: number;
    asType: null | "8" | "16" | "32";
    align: number;
}
export declare class If extends Node {
    constructor(blockType?: Array<StackType>);
    readonly op: string;
    toWast(indent: string): string;
    blockType: Array<StackType>;
}
export declare class Else extends Node {
    readonly op: string;
    toWast(indent: string): string;
}
export declare class Block extends Node {
    readonly op: string;
    toWast(indent: string): string;
}
export declare class Loop extends Node {
    readonly op: string;
    toWast(indent: string): string;
}
export declare class End extends Node {
    readonly op: string;
    toWast(indent: string): string;
}
export declare class Call extends Node {
    constructor(index: number | string);
    readonly op: string;
    toWast(indent: string): string;
    index: number | string;
}
export declare class CallIndirect extends Node {
    constructor(typeName: string);
    readonly op: string;
    toWast(indent: string): string;
    typeName: string;
}
export declare class Br extends Node {
    constructor(depth: number);
    readonly op: string;
    toWast(indent: string): string;
    depth: number;
}
export declare class BrIf extends Node {
    constructor(depth: number);
    readonly op: string;
    toWast(indent: string): string;
    depth: number;
}
export declare class BrTable extends Node {
    constructor(depths: Array<number>);
    readonly op: string;
    toWast(indent: string): string;
    depths: Array<number>;
}
export declare class Wrap extends Node {
    readonly op: string;
    toWast(indent: string): string;
}
export declare class Extend extends Node {
    constructor(signed: boolean);
    readonly op: string;
    toWast(indent: string): string;
    private signed;
}
export declare class Promote extends Node {
    readonly op: string;
    toWast(indent: string): string;
}
export declare class Demote extends Node {
    readonly op: string;
    toWast(indent: string): string;
}
export declare class Convert extends Node {
    constructor(to: "f32" | "f64", from: "i32" | "i64", signed: boolean);
    readonly op: string;
    toWast(indent: string): string;
    to: "f32" | "f64";
    from: "i32" | "i64";
    signed: boolean;
}
export declare class Trunc extends Node {
    constructor(to: "i32" | "i64", from: "f32" | "f64", signed: boolean);
    readonly op: string;
    toWast(indent: string): string;
    to: "i32" | "i64";
    from: "f32" | "f64";
    signed: boolean;
}
export declare class Unreachable extends Node {
    readonly op: string;
    toWast(indent: string): string;
}
export declare class Comment extends Node {
    constructor(comment: string);
    readonly op: string;
    toWast(indent: string): string;
    comment: string;
}
export declare class Global extends Node {
    constructor(type: StackType, name?: string, mutable?: boolean, initial?: Array<Node> | null);
    readonly op: string;
    toWast(indent: string): string;
    name: string | null;
    type: StackType;
    mutable: boolean;
    initial: Array<Node> | null;
}
export declare class CurrentMemory extends Node {
    readonly op: string;
    toWast(indent: string): string;
}
export declare class GrowMemory extends Node {
    readonly op: string;
    toWast(indent: string): string;
}
