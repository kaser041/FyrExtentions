import { Package } from "./pkg";
import * as backend from "./backend";
import * as ssa from "./ssa";
export declare type BinaryOperator = "*" | "/" | "%" | "+" | "-" | "->" | "." | ">>" | "<<" | "<" | ">" | "<=" | ">=" | "==" | "!=" | "&" | "^" | "|" | "&&" | "||" | "=" | "+=" | "-=" | "/=" | "*=" | "%=" | "<<=" | ">>=" | "&=" | "^=" | "|=" | "[";
export declare class FunctionImport implements backend.FunctionImport {
    getIndex(): number;
    isImported(): boolean;
    index: number;
    name: string;
    pkg?: Package;
}
export declare class Function implements backend.Function {
    constructor();
    getIndex(): number;
    isImported(): boolean;
    index: number;
    name: string;
    func: CFunction;
    node: ssa.Node;
    isExported: boolean;
}
declare class InterfaceDescriptor {
    name: CConst;
    table: Array<CConst>;
}
export declare class CBackend implements backend.Backend {
    constructor(pkg: Package);
    importFunction(name: string, from: string | Package, type: ssa.FunctionType): backend.FunctionImport;
    declareGlobalVar(name: string, type: ssa.Type | ssa.StructType): ssa.Variable;
    declareFunction(name: string): backend.Function;
    declareInitFunction(name: string): backend.Function;
    getInitFunction(): Function;
    defineFunction(n: ssa.Node, f: backend.Function, isExported: boolean, isPossibleDuplicate: boolean): void;
    private mangleName;
    generateModule(emitIR: boolean, initPackages: Array<Package> | null, duplicateCodePackages: Array<Package> | null): string;
    addFunctionToTable(f: Function, index: number): void;
    addInterfaceDescriptor(name: string, table: Array<Function | FunctionImport>): number;
    getImplementationCode(): string;
    getHeaderCode(): string;
    private typecode;
    private mangledTypecode;
    private mapType;
    private mapToSignedType;
    private mapToUnsignedType;
    private isSignedType;
    private emitExpr;
    private emitExprIntern;
    private includeMathHeaderFile;
    private includeStringHeaderFile;
    private includePackageHeaderFile;
    private emitCode;
    private analyzeVariableStorage;
    private assignVariableStorage;
    hasMainFunction(): boolean;
    private pkg;
    private optimizer;
    private stackifier;
    private module;
    private initFunction;
    private mainFunction;
    private globalVariables;
    private funcs;
    private currentFunction;
    private blocks;
    private blockStack;
    private operatorMap;
    private returnVariables;
    private localVariables;
    private parameterVariables;
    private varStorage;
    private globalStorage;
    private namedStructs;
    private anonymousStructs;
}
export declare class CInclude {
    toString(): string;
    path: string;
    isSystemPath: boolean;
}
export declare class CModule {
    getImplementationCode(pkg: Package): string;
    getHeaderCode(pkg: Package): string;
    hasInclude(path: string, isSystemPath: boolean): boolean;
    addString(str: string): CString;
    includes: Array<CInclude>;
    strings: Map<string, CString>;
    elements: Array<CStruct | CFunction | CVar | CComment | CType>;
    ifaceDescriptors: Array<InterfaceDescriptor>;
    isExecutable: boolean;
}
export declare abstract class CNode {
    precedence(): number;
    abstract toString(indent: string): string;
}
export declare class CString extends CNode {
    constructor(str: string);
    toString(indent?: string): string;
    private static counter;
    static toUTF8Array(str: string): Array<number>;
    bytes: Array<number>;
    name: string;
}
export declare class CStruct extends CNode {
    toString(indent?: string): string;
    name: string;
    fields: Array<CFunctionParameter>;
}
export declare class CFunction extends CNode {
    toString(indent?: string): string;
    declaration(): string;
    name: string;
    returnType: CType;
    parameters: Array<CFunctionParameter>;
    body: Array<CNode>;
    isPossibleDuplicate: boolean;
}
export declare class CFunctionParameter {
    toString(): string;
    name: string;
    type: CType;
}
export declare class CType {
    constructor(code: string);
    toString(): string;
    code: string;
}
export declare class CReturn extends CNode {
    toString(indent?: string): string;
    expr?: CNode;
}
export declare class CUnary extends CNode {
    toString(indent?: string): string;
    precedence(): number;
    expr: CNode;
    operator: "*" | "&" | "!" | "~" | "sizeof" | "--" | "++" | "+" | "-";
}
export declare class CBinary extends CNode {
    toString(indent?: string): string;
    precedence(): number;
    lExpr: CNode;
    rExpr: CNode;
    operator: BinaryOperator;
}
export declare class CFunctionCall extends CNode {
    toString(indent?: string): string;
    precedence(): number;
    funcExpr: CNode;
    args: Array<CNode>;
}
export declare class CTypeCast extends CNode {
    toString(indent?: string): string;
    precedence(): number;
    type: CType;
    expr: CNode;
}
export declare class CVar extends CNode {
    toString(indent?: string): string;
    name: string;
    type: CType;
    initExpr?: CNode;
}
export declare class CConst extends CNode {
    constructor(code: string);
    toString(indent?: string): string;
    code: string;
}
export declare class CComment extends CNode {
    constructor(text: string);
    toString(indent?: string): string;
    text: string;
}
export declare class CIf extends CNode {
    constructor(expr: CNode);
    toString(indent?: string): string;
    expr: CNode;
    body: Array<CNode>;
    elseClause: CElse;
}
export declare class CElse extends CNode {
    toString(indent?: string): string;
    body: Array<CNode>;
}
export declare class CLabel extends CNode {
    constructor(name: string);
    toString(indent?: string): string;
    name: string;
}
export declare class CGoto extends CNode {
    constructor(name: string);
    toString(indent?: string): string;
    name: string;
}
export declare class CCompoundLiteral extends CNode {
    toString(indent?: string): string;
    precedence(): number;
    values: Array<CNode>;
}
export {};
