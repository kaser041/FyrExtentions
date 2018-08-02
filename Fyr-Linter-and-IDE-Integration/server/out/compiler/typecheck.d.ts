import { Node, Location } from "./ast";
import { Package, SystemCalls } from "./pkg";
export interface ScopeElement {
    name: string;
    type: Type;
    loc: Location;
}
export declare class ImportedPackage implements ScopeElement {
    constructor(name: string, pkg: Package, loc: Location);
    name: string;
    type: Type;
    loc: Location;
    pkg: Package;
}
export declare class Variable implements ScopeElement {
    isResult: boolean;
    isGlobal: boolean;
    isConst: boolean;
    name: string;
    type: Type;
    loc: Location;
    node: Node;
    localReferenceCount: number;
}
export declare class Function implements ScopeElement {
    constructor();
    readonly isImported: boolean;
    name: string;
    type: FunctionType;
    /**
     * True, if the function returns a tuple and names have been assigned to all tuple elements.
     * In this case the function can exit with just "return", i.e. without specifying explicit return values.
     */
    hasNamedReturnVariables: boolean;
    /**
     * If the function returns a tuple, this array holds one variable for each element of the array.
     * If the tuple elements have no name, one is automatically generated.
     */
    namedReturnVariables: null | Array<Variable>;
    unnamedReturnVariable: Variable | null;
    scope: Scope;
    node: Node;
    loc: Location;
    importFromModule: string;
    isExported: boolean;
    isTemplateInstance: boolean;
}
export declare class FunctionParameter implements ScopeElement {
    name: string;
    ellipsis: boolean;
    type: Type;
    loc: Location;
    localReferenceCount: number;
    isConst: boolean;
}
/**
 * TemplateFunctions are registered in a scope.
 * They represent a TemplateType which yields a TemplateFunctionType when instantiated.
 * Unlike normal Function objects, TemplateFunctions are not fully parsed and type checked.
 * This happens only upon instantiation.
 */
export declare class TemplateFunction implements ScopeElement {
    node: Node;
    name: string;
    type: TemplateType;
    namedReturnTypes: boolean;
    loc: Location;
    importFromModule: string;
    isExported: boolean;
    owner?: TemplateType;
}
export declare class Typedef {
    name: string;
    type: Type;
    node: Node;
    scope: Scope;
    _tc: TypeChecker;
    _mark: boolean;
}
export declare class Scope {
    constructor(parent: Scope);
    resolveElement(name: string): ScopeElement;
    resolveType(name: string): Type;
    /**
     * @param name
     * @param element
     */
    registerType(name: string, type: Type, loc?: Location): void;
    replaceType(name: string, type: Type): void;
    /**
     * @param name
     * @param element
     */
    registerElement(name: string, element: ScopeElement, loc?: Location): void;
    resetGroups(): void;
    resolveGroup(element: ScopeElement): Group | null;
    setGroup(element: ScopeElement, group: Group | null): void;
    makeGroupUnavailable(g: Group): void;
    isGroupAvailable(g: Group): boolean;
    resolveCanonicalGroup(g: Group): Group;
    joinGroups(group1: Group | null, group2: Group | null, loc: Location, doThrow: boolean): Group;
    mergeScopes(scope: Scope, mode: "conditional" | "subsequent" | "reverted_subsequent"): void;
    envelopingFunction(): Function;
    isInForLoop(): boolean;
    isChildScope(parent: Scope): boolean;
    package(): Package;
    func: Function;
    forLoop: boolean;
    elements: Map<string, ScopeElement>;
    types: Map<string, Type>;
    canonicalGroups: Map<Group, Group>;
    unavailableGroups: Set<Group>;
    elementGroups: Map<ScopeElement, Group | null>;
    parent: Scope | null;
    pkg: Package;
    private static counter;
}
/**
 * Type is the base class for all types.
 */
export declare abstract class Type {
    name: string;
    loc: Location;
    groupName: string;
    toString(): string;
    abstract toTypeCodeString(): string;
}
/**
 * BasicType represents all built-in types.
 */
export declare class BasicType extends Type {
    constructor(name: "void" | "bool" | "float" | "double" | "null" | "int8" | "uint8" | "int16" | "uint16" | "int32" | "uint32" | "int64" | "uint64" | "rune" | "any" | "string");
    toTypeCodeString(): string;
}
export declare class InterfaceType extends Type {
    getAllMethods(map?: Map<string, FunctionType>): Map<string, FunctionType>;
    getAllBaseTypes(base?: Array<InterfaceType>): Array<InterfaceType>;
    toString(): string;
    toTypeCodeString(): string;
    method(name: string): FunctionType;
    pkg?: Package;
    extendsInterfaces: Array<Type | InterfaceType>;
    methods: Map<string, FunctionType>;
    _markChecked: boolean;
}
export declare class StructType extends Type {
    constructor();
    field(name: string, ownFieldsOnly?: boolean): StructField;
    method(name: string): FunctionType;
    toString(): string;
    toTypeCodeString(): string;
    getAllMethodsAndFields(map?: Map<string, FunctionType | StructField>): Map<string, FunctionType | StructField>;
    getAllBaseTypes(base?: Array<StructType>): Array<StructType>;
    doesExtend(parent: StructType): boolean;
    pkg: Package;
    extends: StructType;
    implements: Array<InterfaceType>;
    fields: Array<StructField>;
    methods: Map<string, FunctionType>;
    _markChecked: boolean;
}
export declare class StructField {
    toString(): string;
    toTypeCodeString(): string;
    name: string;
    type: Type;
}
export declare type CallingConvention = "fyr" | "fyrCoroutine" | "system" | "native";
export declare class FunctionType extends Type {
    constructor();
    toString(): string;
    toTypeCodeString(): string;
    hasEllipsis(): boolean;
    lastParameter(): FunctionParameter;
    requiredParameterCount(): number;
    isAsync(): boolean;
    createGroups(): Map<string, Group>;
    returnType: Type;
    parameters: Array<FunctionParameter>;
    callingConvention: CallingConvention;
    objectType: Type;
    systemCallType: SystemCalls;
}
export declare class GenericParameter extends Type {
    toTypeCodeString(): string;
}
/**
 * TemplateType can either be a template function or a template struct.
 * Template types have template parameters which are type-wildcards with optional constraints.
 * The template type can be instantiated to become a TemplateFunctionType or a TemplateStructType
 * by binding concrete types to these type-wildcards.
 */
export declare class TemplateType extends Type {
    constructor();
    toTypeCodeString(): string;
    toString(): string;
    templateParameterTypes: Array<Node | null>;
    templateParameterNames: Array<string>;
    node: Node;
    parentScope: Scope;
    registerScope: Scope;
    methods: Array<TemplateFunction>;
    pkg: Package;
}
/**
 * TemplateFunctionType is the instance of a TemplateType.
 */
export declare class TemplateFunctionType extends FunctionType {
    constructor();
    toString(): string;
    templateParameterTypes: Array<Type>;
    base: TemplateType;
}
/**
 * TemplateStructType is the instance of a TemplateType.
 */
export declare class TemplateStructType extends StructType {
    constructor();
    toString(): string;
    templateParameterTypes: Array<Type>;
    base: TemplateType;
}
/**
 * TemplateInterfaceType is the instance of a TemplateType.
 */
export declare class TemplateInterfaceType extends InterfaceType {
    constructor();
    toString(): string;
    templateParameterTypes: Array<Type>;
    base: TemplateType;
}
export declare class PointerType extends Type {
    constructor(elementType: Type, mode: PointerMode);
    toString(): string;
    toTypeCodeString(): string;
    elementType: Type;
    /**
     * Determines whether the pointer is an owning pointer, a reference, or a unique pointer.
     */
    mode: PointerMode;
}
export declare class UnsafePointerType extends Type {
    constructor(elementType: Type);
    toString(): string;
    toTypeCodeString(): string;
    elementType: Type;
}
export declare class MapType extends Type {
    constructor(keyType: Type, valueType: Type);
    toString(): string;
    toTypeCodeString(): string;
    keyType: Type;
    valueType: Type;
}
export declare enum GroupKind {
    Free = 0,
    Bound = 1
}
export declare class Group {
    constructor(kind: GroupKind, name?: string);
    private static counter;
    kind: GroupKind;
    name: string;
    preJoin(scope: Scope, loc: Location, doThrow: boolean): Group;
    static isLess(g1: Group, g2: Group): boolean;
    isBound(scope: Scope): boolean;
    private counter;
    private static groupCounter;
}
export declare class TupleGroup extends Group {
    constructor(kind: GroupKind, name?: string);
    preJoin(scope: Scope, loc: Location, doThrow: boolean): Group;
    groups: Array<Group>;
}
export declare class Taint {
    constructor(group: Group, loc: Location);
    loc: Location;
    group: Group;
}
export declare type Restrictions = {
    isConst?: boolean;
};
export declare function combineRestrictions(r1: Restrictions, r2: Restrictions): Restrictions;
export declare class RestrictedType extends Type {
    constructor(elementType: Type, r?: Restrictions | null);
    static strip(t: Type): Type;
    toString(omitElement?: boolean): string;
    toTypeCodeString(): string;
    elementType: Type;
    isConst?: boolean;
}
export declare type PointerMode = "unique" | "strong" | "reference" | "local_reference";
export declare class ArrayType extends Type {
    constructor(elementType: Type, size: number);
    getElementType(): Type;
    toString(): string;
    toTypeCodeString(): string;
    elementType: Type;
    size: number;
}
export declare class SliceType extends Type {
    constructor(arrayType: ArrayType | RestrictedType, mode: PointerMode);
    array(): ArrayType;
    getElementType(): Type;
    toString(): string;
    toTypeCodeString(): string;
    mode: PointerMode;
    arrayType: ArrayType | RestrictedType;
}
export declare class ArrayLiteralType extends Type {
    constructor(types: Array<Type>);
    toString(): string;
    toTypeCodeString(): string;
    types: Array<Type>;
}
export declare class ObjectLiteralType extends Type {
    constructor(types: Map<string, Type>);
    toTypeCodeString(): string;
    toString(): string;
    types: Map<string, Type>;
}
export declare class TupleType extends Type {
    constructor(types: Array<Type>);
    toString(): string;
    toTypeCodeString(): string;
    types: Array<Type>;
}
export declare class TupleLiteralType extends Type {
    constructor(types: Array<Type>);
    toString(): string;
    toTypeCodeString(): string;
    types: Array<Type>;
}
export declare class OrType extends Type {
    constructor(types?: Array<Type>);
    types: Array<Type>;
    toString(): string;
    toTypeCodeString(): string;
    stringsOnly(): boolean;
}
export declare class StringLiteralType extends Type {
    constructor(name: string);
    toString(): string;
    toTypeCodeString(): string;
}
export declare class PackageType extends Type {
    constructor(name: string, pkg: Package, loc: Location);
    toString(): string;
    toTypeCodeString(): string;
    pkg: Package;
}
export declare class ScopeExit {
    merge(s: ScopeExit): void;
    returns: Array<Scope>;
    breaks: Array<Scope>;
    continues: Array<Scope>;
    fallthrough: Scope | null;
}
export declare class TypeChecker {
    constructor(pkg: Package);
    createType(tnode: Node, scope: Scope, mode?: "default" | "parameter" | "variable" | "variable_toplevel" | "parameter_toplevel"): Type;
    private createTypeIntern;
    private createOrType;
    private createInterfaceType;
    private checkInterfaceType;
    private createStructType;
    checkStructType(s: StructType): void;
    private instantiateTemplateType;
    private instantiateTemplateMemberFunction;
    /**
     * Parses the instantiation of a template function, e.g. in "max<int>(4,5)" this function parses "max<int>".
     */
    private instantiateTemplateFunctionFromNode;
    /**
     * Instantiates a template function.
     */
    private instantiateTemplateFunction;
    static mangleTemplateParameters(types: Array<Type>): string;
    static mangledTypeName(t: Type): string;
    createFunction(fnode: Node, parentScope: Scope, registerScope: Scope, templateBase?: TemplateType, templateParameterTypes?: Array<Type>): Function | TemplateFunction;
    private createVar;
    private createTypedef;
    private createImport;
    private createFunctionImport;
    private importTypes;
    private importFunctions;
    checkModule(pkg: Package): Scope;
    checkModulePassTwo(): void;
    checkModulePassThree(): void;
    private checkFunctionBody;
    checkVarAssignment(isConst: boolean, scope: Scope, vnode: Node, rtype: Type, rnode?: Node): void;
    checkAssignment(scope: Scope, vnode: Node, rtype: Type, rnode?: Node): void;
    private checkStatements;
    checkStatement(snode: Node, scope: Scope, scopeExit: ScopeExit): void;
    checkExpression(enode: Node, scope: Scope): void;
    private checkGlobalVariable;
    private defaultLiteralType;
    private unifyLiterals;
    checkIsAssignableNode(to: Type, from: Node, scope: Scope, doThrow?: boolean, templateParams?: Map<string, Type>): boolean;
    checkIsAssignableType(to: Type, from: Type, loc: Location, mode: "assign" | "equal" | "pointer", doThrow?: boolean, toRestrictions?: Restrictions, fromRestrictions?: Restrictions, templateParams?: Map<string, Type>): boolean;
    checkFunctionArguments(ft: FunctionType, args: Array<Node> | null, scope: Scope, loc: Location, doThrow?: boolean): boolean;
    checkTemplateFunctionArguments(t: TemplateType, args: Array<Node>, scope: Scope, loc: Location): Map<string, Type>;
    checkIsEnumerable(node: Node): [Type, Type];
    checkIsIndexable(node: Node, index: number, indexCanBeLength?: boolean): Type;
    checkIsAddressable(node: Node, scope: Scope, withAmpersand: boolean, doThrow?: boolean): boolean;
    checkIsPointer(node: Node, doThrow?: boolean): boolean;
    checkIsString(node: Node, doThrow?: boolean): boolean;
    checkIsSignedNumber(node: Node, doThrow?: boolean): boolean;
    checkIsUnsignedNumber(node: Node, doThrow?: boolean): boolean;
    checkIsBool(node: Node, doThrow?: boolean): boolean;
    checkIsNumber(node: Node, doThrow?: boolean): boolean;
    checkIsIntNumber(node: Node, doThrow?: boolean): boolean;
    checkIsPlatformIntNumber(node: Node, doThrow?: boolean): boolean;
    checkIsInt32Number(node: Node, doThrow?: boolean): boolean;
    checkIsIntNumberOrUnsafePointer(node: Node, doThrow?: boolean): boolean;
    checkIsInterface(node: Node, doThrow?: boolean): boolean;
    checkFunctionEquality(a: FunctionType, b: FunctionType, loc: Location, allowMoreRestrictions: boolean, doThrow?: boolean): boolean;
    checkTypeEquality(a: Type, b: Type, loc: Location, doThrow?: boolean): boolean;
    private isLeftHandSide;
    checkIsMutable(node: Node, scope: Scope, doThrow?: boolean): boolean;
    private checkVariableType;
    stripType(t: Type): Type;
    isString(t: Type): boolean;
    isTupleType(t: Type): boolean;
    isStringLiteralType(t: Type): boolean;
    isAny(t: Type): boolean;
    isOrType(t: Type): boolean;
    isComplexOrType(t: Type): boolean;
    isStringOrType(t: Type): boolean;
    isInterface(t: Type): boolean;
    private isMap;
    private mapKeyType;
    private mapValueType;
    isSlice(t: Type): boolean;
    isArray(t: Type): boolean;
    isUnsafePointer(t: Type): boolean;
    isNumber(t: Type): boolean;
    isStruct(t: Type): boolean;
    isTuple(t: Type): boolean;
    isTemplateType(t: Type): boolean;
    isMutableValue(t: Type): boolean;
    static isStrong(t: Type): boolean;
    static isUnique(t: Type): boolean;
    static isReference(t: Type): boolean;
    static isLocalReference(t: Type): boolean;
    isConst(t: Type): boolean;
    isPlatformIntNumber(type: Type): boolean;
    isIntNumber(type: Type): boolean;
    isInt32Number(t: Type): boolean;
    isUInt32Number(t: Type): boolean;
    isPrimitive(t: Type): boolean;
    isSafePointer(t: Type): boolean;
    static hasStrongOrUniquePointers(t: Type): boolean;
    static hasReferenceOrStrongPointers(t: Type): boolean;
    static hasLocalReference(t: Type): boolean;
    /**
     * A pure value contains no pointers and can be copied byte by byte.
     */
    isPureValue(t: Type): boolean;
    applyConst(t: Type, loc: Location): Type;
    makeConst(t: Type, loc: Location): Type;
    pointerElementType(t: Type): Type;
    sliceArrayType(t: Type): Type;
    arrayElementType(t: Type): Type;
    private stringLiteralType;
    private checkGroupsInFunction;
    private checkGroupsInStatement;
    private checkGroupsInAssignment;
    private checkGroupsInSingleAssignment;
    private checkGroupsInExpression;
    checkGroupsInFunctionArguments(ft: FunctionType, defaultGroup: Group, args: Array<Node> | null, scope: Scope, loc: Location): Group;
    isTakeExpression(enode: Node): boolean;
    hasTemplateInstantiations(): boolean;
    static t_bool: Type;
    static t_float: Type;
    static t_double: Type;
    static t_null: Type;
    static t_int8: Type;
    static t_int16: Type;
    static t_int32: Type;
    static t_int64: Type;
    static t_uint8: Type;
    static t_byte: Type;
    static t_char: Type;
    static t_int: Type;
    static t_uint16: Type;
    static t_uint32: Type;
    static t_uint64: Type;
    static t_uint: Type;
    static t_string: Type;
    static t_rune: Type;
    static t_void: Type;
    static t_any: Type;
    static t_error: InterfaceType;
    ifaces: Array<InterfaceType>;
    structs: Array<StructType>;
    templateTypeInstantiations: Map<TemplateType, Array<TemplateStructType | TemplateInterfaceType | TemplateFunctionType>>;
    templateFunctionInstantiations: Map<TemplateType, Array<Function>>;
    pkg: Package;
    private typedefs;
    private functions;
    private globalVariables;
    private stringLiteralTypes;
    private moduleNode;
    private globalGroup;
}
export declare class TypeError {
    constructor(message: string, loc: Location);
    message: string;
    location: Location;
}
