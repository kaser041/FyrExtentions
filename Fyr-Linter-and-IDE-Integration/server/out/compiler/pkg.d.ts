import ast = require("./ast");
import { TypeChecker, Scope } from "./typecheck";
import { CodeGenerator } from "./codegen";
export declare enum SystemCalls {
    heap = -1,
    currentMemory = -2,
    growMemory = -3,
    heapTypemap = -4,
    pageSize = -5,
    defaultStackSize = -6,
    stackPointer = -8,
    createMap = -15,
    setMap = -16,
    hashString = -17,
    lookupMap = -18,
    removeMapKey = -19,
    setNumericMap = -20,
    lookupNumericMap = -21,
    removeNumericMapKey = -22,
    abs32 = -23,
    abs64 = -24,
    sqrt32 = -25,
    sqrt64 = -26,
    trunc32 = -27,
    trunc64 = -28,
    nearest32 = -29,
    nearest64 = -30,
    ceil32 = -31,
    ceil64 = -32,
    floor32 = -33,
    floor64 = -34,
    max32 = -35,
    max64 = -36,
    min32 = -37,
    min64 = -38,
    copysign32 = -39,
    copysign64 = -49,
    decodeUtf8 = -51,
    continueCoroutine = -52,
    scheduleCoroutine = -53,
    coroutine = -54
}
export declare class Package {
    constructor(mainPackage?: boolean);
    sourcePath(): string;
    /**
     * Might throw ImportError
     */
    findSources(fyrPath: string, pkgPath: string): void;
    setSources(files: Array<string>): void;
    /**
     * Might throw SyntaxError or ImportError
     */
    loadSources(): void;
    /**
     * Might throw TypeError
     */
    checkPackagePassTwo(): void;
    /**
     * Might throw TypeError
     */
    checkPackagePassThree(): void;
    generateCode(backend: "C" | "WASM" | null, emitIR: boolean, initPackages: Array<Package> | null, duplicateCodePackages: Array<Package>, disableNullCheck: boolean): void;
    generateObjectFiles(backend: "C" | "WASM" | null): void;
    /**
     * Might throw ImportError
     */
    private createObjFilePath;
    hasTemplateInstantiations(): boolean;
    static checkTypesForPackages(): void;
    static generateCodeForPackages(backend: "C" | "WASM" | null, emitIR: boolean, emitNative: boolean, disableNullCheck: boolean): void;
    static getFyrPaths(): Array<string>;
    static resolve(pkgPath: string, loc: ast.Location): Package | null;
    static registerPackage(p: Package): void;
    pkgNode: ast.Node;
    pkgPath: string;
    fyrPath: string;
    scope: Scope;
    tc: TypeChecker;
    files: Array<string>;
    codegen: CodeGenerator;
    objFilePath: string;
    objFileName: string;
    binFilePath: string;
    binFileName: string;
    isInternal: boolean;
    isImported: boolean;
    hasMain: boolean;
    hasInitFunction: boolean;
    /**
     * The package we are generating an executable or library for or null if
     * no such target is being built;
     */
    static mainPackage: Package | null;
    private static packagesByPath;
    private static packages;
    private static fyrPaths;
    static fyrBase: string;
}
export declare class ImportError {
    constructor(message: string, loc: ast.Location, path: string);
    message: string;
    location: ast.Location;
    path: string;
}
