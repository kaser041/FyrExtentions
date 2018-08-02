import * as wasm from "./wasm";
import { Package } from "./pkg";
import { Type, StructType, FunctionType, Variable, Node } from "./ssa";
import * as backend from "./backend";
export declare type Wasm32StorageType = "local" | "vars" | "params" | "result" | "local_result" | "local_var" | "global" | "global_heap" | "global_strings";
export declare class Wasm32Storage {
    storageType: Wasm32StorageType;
    offset: number;
}
export declare class Wasm32Backend implements backend.Backend {
    constructor();
    getCode(): string;
    addInterfaceDescriptor(name: string, table: Array<backend.Function | backend.FunctionImport>): number;
    addFunctionToTable(f: backend.Function, index: number): void;
    importFunction(name: string, from: string | Package, type: FunctionType): backend.FunctionImport;
    declareGlobalVar(name: string, type: Type | StructType): Variable;
    declareFunction(name: string): backend.Function;
    declareInitFunction(name: string): backend.Function;
    getInitFunction(): backend.Function;
    defineFunction(n: Node, f: wasm.Function, isExported: boolean, isPossibleDuplicate: boolean): void;
    generateModule(emitIR: boolean, initPackages: Array<Package> | null, duplicateCodePackages: Array<Package> | null): string;
    private generateFunction;
    private generateSyncFunction;
    private generateAsyncFunction;
    /**
     * Collects all steps and async calls
     * and remove all 'const' nodes which assign to variables that are SSA.
     */
    private traverse;
    private analyzeVariableStorage;
    private assignVariableStorage;
    private emitSteps;
    /**
     * 'depth' is the nesting of block/loop/if constructs.
     * This is required to branch to the function's main loop.
     */
    private emitStep;
    private emitCode;
    /**
     */
    private emitAssign;
    private emitAssignZeroStruct;
    private emitCopy;
    private emitAddrOfVariable;
    private emitWordAssign;
    private emitWordVariable;
    /**
     * Emits code for Node 'n'. The result of the node is a word-type (i.e. it fits on the WASM stack).
     * The result is either assigned to a variable or put on the wasm stack or both or no
     * assignment happens at all.
     */
    private emitWordNode;
    /**
     * @return the number of struct fields that must be zero-assigned.
     */
    private needsMemZero;
    /**
     * @return the number of struct fields that must be zero-assigned, but just if ALL fields are zero assigned.
     *         The function returns -1 if at least one field is not zero'd.
     */
    private allMemZero;
    private storeVariableFromWasmStack1;
    private storeVariableFromWasmStack2;
    private asyncCallNumber;
    private stepNumber;
    private stepNumberFromName;
    private isBinaryInstruction;
    private isUnaryInstruction;
    private stackTypeOf;
    private allocLocal;
    private freeLocal;
    private getTmpLocal;
    private storageOf;
    private wfHasHeapFrame;
    private encodeLiteral;
    private encodeLiteralIntern;
    module: wasm.Module;
    private tr;
    private optimizer;
    private stackifier;
    private funcs;
    private globalVariables;
    private globalVarStorage;
    private copyFunctionIndex;
    private allocFunctionIndex;
    private sliceAppendFunctionIndex;
    private garbageCollectFunctionIndex;
    private growSliceFunctionIndex;
    private makeStringFunctionIndex;
    private compareStringFunctionIndex;
    private concatStringFunctionIndex;
    private hashStringFunctionIndex;
    private createMapFunctionIndex;
    private setMapFunctionIndex;
    private lookupMapFunctionIndex;
    private removeMapKeyFunctionIndex;
    private setNumericMapFunctionIndex;
    private lookupNumericMapFunctionIndex;
    private removeNumericMapKeyFunctionIndex;
    private decodeUtf8FunctionIndex;
    private scheduleCoroutineFunctionIndex;
    private currentCoroutineFunctionIndex;
    private createCoroutineFunctionIndex;
    private stepLocal;
    private bpLocal;
    private spLocal;
    private asyncReturnLocal;
    private steps;
    private stepCode;
    private stepsByName;
    private asyncCalls;
    private asyncCallCode;
    private resultFrame;
    private paramsFrame;
    private varsFrame;
    private varsFrameHeader;
    /**
     * Stores for each variable in the current function where it is located.
     */
    private varStorage;
    /**
     * Some variables have two storage locations. A fast one (local variable) and one on the stack frame
     * where the GC can find it.
     *
     * Variables listed here are access in write-through. That means writes target the local variable and
     * the stack frame. Reading happens on the local variable only.
     */
    private varGCStorage;
    /**
     * Some variables have two storage locations. A fast one (local variable) and one on the stack frame
     * where it survives the suspension of a coroutine.
     *
     * Variables listed here are saved to the stack frame before the function returns.
     */
    private varAsyncStorage;
    private varBinaryConstants;
    private parameterVariables;
    private localVariables;
    private returnVariables;
    private tmpLocalVariables;
    private tmpI32Local;
    private tmpI64Local;
    private tmpF32Local;
    private tmpF64Local;
    private tmpI32SrcLocal;
    private tmpI32DestLocal;
    private wf;
    private wfIsAsync;
    private heapGlobalVariable;
    private heapGlobalVariableIndex;
    private typemapGlobalVariable;
    private typemapGlobalVariableIndex;
    private customglobalVariablesIndex;
    private heapSize;
    private stackSize;
}
