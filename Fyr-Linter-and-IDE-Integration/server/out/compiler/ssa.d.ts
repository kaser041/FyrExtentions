import { Package } from "./pkg";
export declare type NodeKind = "spawn" | "spawn_indirect" | "promote" | "demote" | "trunc32" | "trunc64" | "convert32_u" | "convert32_s" | "convert64_u" | "convert64_s" | "goto_step" | "goto_step_if" | "step" | "call_begin" | "call_end" | "call_indirect" | "call_indirect_begin" | "define" | "decl_param" | "decl_result" | "decl_var" | "alloc" | "return" | "yield" | "block" | "loop" | "end" | "if" | "br" | "br_if" | "copy" | "struct" | "trap" | "load" | "store" | "addr_of" | "call" | "const" | "add" | "sub" | "mul" | "div" | "div_s" | "div_u" | "rem_s" | "rem_u" | "and" | "or" | "xor" | "shl" | "shr_u" | "shr_s" | "rotl" | "rotr" | "eq" | "ne" | "lt_s" | "lt_u" | "le_s" | "le_u" | "gt_s" | "gt_u" | "ge_s" | "ge_u" | "lt" | "gt" | "le" | "ge" | "min" | "max" | "eqz" | "clz" | "ctz" | "popcnt" | "neg" | "abs" | "copysign" | "ceil" | "floor" | "trunc" | "nearest" | "sqrt" | "wrap" | "extend" | "free" | "incref" | "decref" | "alloc_arr" | "free_arr" | "incref_arr" | "decref_arr" | "member" | "set_member" | "len_arr" | "memcpy" | "memmove" | "memcmp" | "len_str" | "table_iface";
export declare type Type = "i8" | "i16" | "i32" | "i64" | "s8" | "s16" | "s32" | "s64" | "addr" | "f32" | "f64" | "ptr" | "int" | "sint";
export declare var intSize: number;
export declare var ptrSize: number;
export declare class PointerType {
    constructor(elementType: Type | StructType | PointerType, isConst: boolean);
    elementType: Type | StructType | PointerType;
    isConst: boolean;
}
export declare class StructType {
    addField(name: string, type: Type | StructType | PointerType, count?: number): number;
    addFields(s: StructType): void;
    fieldOffset(name: string): number;
    fieldNameByIndex(index: number): string;
    fieldIndexByName(name: string): number;
    toDetailedString(): string;
    toString(): string;
    fields: Array<[string, Type | StructType | PointerType, number]>;
    fieldOffsetsByName: Map<string, number>;
    size: number;
    name: string | null;
    alignment: number;
    pkg?: Package;
}
export declare function alignmentOf(x: Type | StructType | PointerType): number;
export declare function isSigned(x: Type | PointerType): boolean;
export declare function sizeOf(x: Type | StructType | PointerType): number;
export declare function alignedSizeOf(type: Type | StructType | PointerType): number;
export declare function compareTypes(t1: Type | StructType | PointerType, t2: Type | StructType | PointerType): boolean;
export declare type CallingConvention = "fyr" | "fyrCoroutine" | "system" | "native";
export declare class FunctionType {
    constructor(params: Array<Type | StructType | PointerType>, result: Type | StructType | PointerType | null, conv?: CallingConvention);
    toString(): string;
    readonly stackFrame: StructType;
    isAsync(): boolean;
    params: Array<Type | StructType | PointerType>;
    ellipsisParam: Type | StructType | PointerType | null;
    result: Type | StructType | PointerType | null;
    callingConvention: CallingConvention;
    private _stackFrame;
}
export declare type BinaryData = Array<number | string>;
export declare class Variable {
    constructor(name?: string);
    toString(): string;
    name: string;
    type: Type | StructType | PointerType;
    /**
     * The number of times the value of the variable is used.
     */
    readCount: number;
    /**
     * The number of times the variable is assigned a value.
     */
    writeCount: number;
    /**
     * usedInMultupleSteps is true, if the variable is used in different 'steps'.
     * This is only meaningful when used after SMTransformation.transform().
     */
    usedInMultipleSteps: boolean;
    /**
     * isConstant is true if the variable is assigned exactly once
     * and this value is a constant.
     * The value is set by Optimizer.optimizeConstants() or by the code generation.
     */
    isConstant: boolean;
    /**
     * The value of the variable if it is assigned a constant number.
     * TODO: Cannot hold 64bit integers
     */
    constantValue: number | string | BinaryData;
    /**
     * True if the variable is just a copy of another and hence just an artefact
     * created by the code generation layer.
     */
    isCopy: boolean;
    /**
     * The variable from which this variable is a copy.
     */
    copiedValue: Variable;
    /**
     * addressable is true if 'addr_of' has been used on this variable.
     */
    addressable: boolean;
    /**
     * True, if the variable holds GC-relevant pointers and thus the GC must be able to find the variable.
     */
    gcDiscoverable: boolean;
    /**
     * Internal
     */
    _step: Node;
    private static counter;
}
export declare class Pointer {
    constructor(v: Variable, offset: number);
    offset: number;
    variable: Variable;
}
export declare class Node {
    constructor(assign: Variable, kind: NodeKind, type: Type | FunctionType | StructType | PointerType, args: Array<Variable | string | number>);
    toString(indent: string): string;
    static strainToString(indent: string, n: Node): string;
    static insertBetween(n1: Node, n2: Node, newNode: Node): void;
    static removeNode(n: Node): void;
    name: string;
    kind: NodeKind;
    type: Type | FunctionType | StructType | PointerType;
    next: Array<Node>;
    prev: Array<Node>;
    blockPartner: Node;
    assign: Variable;
    assignType: Type | StructType | PointerType;
    args: Array<Variable | number | Node>;
    isAsync: boolean;
}
export declare class Builder {
    constructor();
    define(name: string, type: FunctionType): Node;
    declareParam(type: Type | StructType | PointerType, name: string): Variable;
    declareResult(type: Type | StructType | PointerType, name: string): Variable;
    declareVar(type: Type | StructType | PointerType, name: string): Variable;
    assign(assign: Variable, kind: NodeKind, type: Type | StructType | PointerType, args: Array<Variable | string | number>): Variable;
    call(assign: Variable, type: FunctionType, args: Array<Variable | string | number>): Variable;
    callIndirect(assign: Variable, type: FunctionType, args: Array<Variable | string | number>): Variable;
    spawn(type: FunctionType, args: Array<Variable | string | number>): void;
    spawnIndirect(assign: Variable, type: FunctionType, args: Array<Variable | string | number>): Variable;
    br(to: Node): void;
    br_if(arg: Variable | string | number, to: Node): void;
    block(): Node;
    loop(): Node;
    end(): void;
    ifBlock(arg: Variable | string | number): Node;
    elseBlock(): void;
    tmp(t?: Type | StructType | PointerType): Variable;
    readonly mem: Variable;
    readonly node: Node;
    private countReadsAndWrites;
    private _node;
    private _mem;
    private _blocks;
    private _current;
}
export declare class Optimizer {
    optimizeConstants(n: Node): void;
    /**
     * Removes all 'const' nodes which assign to variables that are SSA.
     */
    private _optimizeConstants;
    removeDeadCode(n: Node): void;
    /**
     * Traverse the code backwards and remove assignment which assign to variables
     * that are never read.
     */
    private _removeDeadCode1;
    /**
     * Traverse the code forwards and eliminate unreachable code
     */
    private _removeDeadCode2;
    private removeDeadStrain;
    private removeDeadNode;
    analyzeGCDiscoverability(n: Node): void;
    /**
     * The function traverses the code in reverse order and collects all variables of type "ptr" that are assigned before and read
     * after a GC happens. Thus, the object being pointed to is still in use and must be detectable by the GC.
     */
    private _analyzeGCDiscoverability;
}
/**
 * Transforms control flow with loop/block/br/br_if/if into a state machine using
 * step/goto_step/goto_step_if. This happens in all places where execution could block.
 * Non-blocking constructs are left untouched.
 */
export declare class SMTransformer {
    transform(startBlock: Node): void;
    /**
     * Transforms the control flow from block/loop/if/br/br_if/end into a state machine.
     * Therefore, the function inserts step, goto_step and goto_step_if nodes.
     */
    private transformUpTo;
    nextStep(n: Node): Node;
    /**
     * Determines the destination step of goto_step and goto_step_if.
     */
    private insertNextStepsUpTo;
    /**
     * Removes unnecessary block, loop and end nodes.
     */
    private cleanup;
    private stepCounter;
}
export declare class Stackifier {
    constructor(optimizer: Optimizer);
    stackifyStep(start: Node, end: Node): void;
    private findInline;
    /**
     * Like 'findInline' but is assures that the variable assigned by the returned node is not
     * read between 'n' and its assignment.
     * The variable assignment can then be inlined with a tee.
     */
    private findInlineForMultipleReads;
    private collectAssignments;
    private assignsToVariable;
    private readsFromVariable;
    private readsFromVariables;
    private doNotByPassForInline;
    private optimizer;
}
