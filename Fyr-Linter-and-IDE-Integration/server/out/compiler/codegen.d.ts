import { Node } from "./ast";
import { Function, Type, TypeChecker, Scope, Variable, FunctionParameter, ScopeElement } from "./typecheck";
import * as ssa from "./ssa";
import * as backend from "./backend";
import { Package } from "./pkg";
export declare class CodeGenerator {
    constructor(tc: TypeChecker, backend: backend.Backend, disableNullCheck: boolean);
    processModule(mnode: Node, emitIR: boolean, initPackages: Array<Package> | null, duplicateCodePackages: Array<Package> | null): string;
    getSSAType(t: Type): ssa.Type | ssa.StructType | ssa.PointerType;
    private getSSAFunctionType;
    processFunction(f: Function, wf: backend.Function): ssa.Node;
    processScopeVariables(b: ssa.Builder, vars: Map<ScopeElement, ssa.Variable>, scope: Scope): void;
    freeScopeVariables(ignoreVariables: Array<Variable | FunctionParameter>, b: ssa.Builder, vars: Map<ScopeElement, ssa.Variable>, scope: Scope): void;
    processStatement(f: Function, scope: Scope, snode: Node, b: ssa.Builder, vars: Map<ScopeElement, ssa.Variable>, blocks: {
        body: ssa.Node;
        outer: ssa.Node;
    } | null): void;
    processLeftHandExpression(f: Function, scope: Scope, enode: Node, b: ssa.Builder, vars: Map<ScopeElement, ssa.Variable>): ssa.Variable | ssa.Pointer;
    private processPureLiteral;
    private processPureLiteralInternal;
    isLeftHandSide(node: Node): boolean;
    private createInterfaceTable;
    processExpression(f: Function, scope: Scope, enode: Node, b: ssa.Builder, vars: Map<ScopeElement, ssa.Variable>, targetType: Type): ssa.Variable | number;
    private processExpressionIntern;
    private processFillZeros;
    private processCompare;
    isSigned(t: Type): boolean;
    private generateZero;
    private generateZeroStruct;
    private typecode;
    private isThis;
    private isPureLiteral;
    private mangleDestructorName;
    private generateSliceDestructor;
    private generateTupleDestructor;
    private generateStructDestructor;
    private generateArrayDestructor;
    private generatePointerDestructor;
    /**
     * pointer is the address of a value and t is the type of the value being pointed to.
     */
    private callDestructor;
    private callDestructorOnPointer;
    private callDestructorOnVariable;
    private scopeNeedsDestructors;
    private functionArgumentIncref;
    private functionArgumentDecref;
    /**
     * Determines whether the expression enode needs an incref before passing it as argument to a function call.
     * References to values stored in local variables on the stack do not need an incref, if no pointer to said local variables have been passed as arguments already.
     * The reason is that the callee cannot modify the stack variables of the caller.
     * Furthermore, references to objects owned directly via a strong pointer stored on the stack, do not need incref as well.
     * The reason is that local variables of the caller are not modified, hence said object must exist, because the local variable holds a strong pointer on it.
     */
    private functionArgumentIncrefIntern;
    private processLiteralArgument;
    hasDestructors(): boolean;
    private backend;
    private tc;
    private imports;
    private funcs;
    private globalVars;
    private slicePointer;
    private localSlicePointer;
    private ifaceHeader;
    private mapHead;
    private disableNullCheck;
    private createMapFunctionType;
    private setMapFunctionType;
    private hashStringFunctionType;
    private lookupMapFunctionType;
    private removeMapKeyFunctionType;
    private setNumericMapFunctionType;
    private lookupNumericMapFunctionType;
    private removeNumericMapKeyFunctionType;
    private decodeUtf8FunctionType;
    private interfaceTableNames;
    private interfaceTableIndex;
    private interfaceTableLength;
    private typeCodeMap;
    private destructors;
    private structs;
    private ifaceDescriptors;
}
