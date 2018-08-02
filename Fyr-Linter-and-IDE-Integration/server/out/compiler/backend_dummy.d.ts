import * as ssa from "./ssa";
import { Package } from "./pkg";
import * as backend from "./backend";
export declare class FunctionImport implements backend.Function {
    getIndex(): number;
    isImported(): boolean;
    index: number;
    name: string;
}
export declare class Function implements backend.FunctionImport {
    getIndex(): number;
    isImported(): boolean;
    index: number;
    name: string;
    node: ssa.Node;
}
export declare class DummyBackend {
    importFunction(name: string, from: string | Package, type: ssa.FunctionType): backend.FunctionImport;
    declareGlobalVar(name: string, type: ssa.Type | ssa.StructType | ssa.PointerType): ssa.Variable;
    declareFunction(name: string): backend.Function;
    declareInitFunction(name: string): backend.Function;
    getInitFunction(): backend.Function;
    defineFunction(n: ssa.Node, f: backend.Function, isExported: boolean, isPossibleDuplicate: boolean): void;
    generateModule(emitIR: boolean, initPackages: Array<Package> | null, duplicateCodePackages: Array<Package> | null): string;
    addFunctionToTable(f: Function, index: number): void;
    addInterfaceDescriptor(name: string, table: Array<backend.Function | backend.FunctionImport>): number;
    funcs: Array<Function | FunctionImport>;
    initFunction: Function;
}
