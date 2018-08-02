import { Type, Scope, ScopeExit } from "./typecheck";
export declare function setCurrentFile(f: string): void;
export declare function currentFile(): string;
export declare enum AstFlags {
    None = 0,
    ZeroAfterAssignment = 1,
    ReferenceObjectMember = 2
}
export declare type NodeConfig = {
    readonly loc: Location;
    readonly op: NodeOp;
    readonly lhs?: Node;
    readonly condition?: Node;
    readonly rhs?: Node;
    readonly value?: string;
    readonly numValue?: number;
    readonly name?: Node;
    readonly comments?: Array<Node>;
    readonly statements?: Array<Node>;
    readonly elseBranch?: Node;
    readonly parameters?: Array<Node>;
    readonly genericParameters?: Array<Node>;
    readonly groupName?: Node;
    readonly flags?: AstFlags;
    readonly nspace?: string;
};
export declare type LocationPoint = {
    offset: number;
    line: number;
    column: number;
};
export declare type Location = {
    start: LocationPoint;
    end: LocationPoint;
    file: string;
};
export declare type NodeOp = "let_in" | "let" | "take" | "mapType" | "asyncFuncType" | "asyncFunc" | "spawn" | "is" | "rune" | "export_func" | "module" | "file" | "typeCast" | "typedef" | "structField" | "structType" | "interfaceType" | "yield" | "uniquePointerType" | "unsafePointerType" | "ellipsisAssign" | "optionalAssign" | "optionalKeyValue" | "ellipsisParam" | "genericType" | "genericInstance" | "unary..." | "unary+" | "unary-" | "unary!" | "unary^" | "unary&" | "unary*" | "optionalId" | "ellipsisId" | "str" | "=>" | "basicType" | "+" | "-" | "*" | "/" | "&" | "|" | "%" | "^" | "&^" | "in" | "var_in" | "var" | "<<" | ">>" | "if" | "else" | "for" | "func" | "as" | "||" | "&&" | "=" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "*=" | "+=" | "-=" | "/=" | "%=" | "&=" | "&^=" | "<<=" | ">>=" | "|=" | "^=" | "?" | "..." | "!" | "id" | "str" | "bool" | "object" | "array" | "keyValue" | "orType" | "andType" | "tuple" | "arrayType" | "sliceType" | "tupleType" | "pointerType" | "funcType" | "comment" | "break" | "continue" | "return" | "++" | "--" | ";;" | "null" | "float" | "int" | "." | "[" | ":" | "(" | "import" | "importWasm" | "identifierList" | "referenceType" | "localReferenceType" | "constType" | "implements" | "extends" | "copy" | "clone" | "len" | "cap" | "sizeof" | "aligned_sizeof" | "append";
export declare class Node {
    constructor(config?: NodeConfig);
    stringify(prefix: string): string;
    isUnifyableLiteral(): boolean;
    clone(): Node;
    op: NodeOp;
    lhs: Node;
    rhs: Node;
    value: string;
    numValue: number;
    name: Node;
    loc: Location;
    comments: Array<Node>;
    condition: Node;
    statements: Array<Node>;
    elseBranch: Node;
    parameters: Array<Node>;
    genericParameters: Array<Node>;
    groupName: Node;
    type: Type;
    nspace: string;
    scope: Scope;
    scopeExit: ScopeExit;
    flags: AstFlags;
}
