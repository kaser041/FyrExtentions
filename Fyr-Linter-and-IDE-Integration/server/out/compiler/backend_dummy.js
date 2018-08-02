"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ssa = require("./ssa");
class FunctionImport {
    getIndex() {
        return this.index;
    }
    isImported() {
        return true;
    }
}
exports.FunctionImport = FunctionImport;
class Function {
    getIndex() {
        return this.index;
    }
    isImported() {
        return false;
    }
}
exports.Function = Function;
class DummyBackend {
    constructor() {
        this.funcs = [];
    }
    importFunction(name, from, type) {
        let f = new FunctionImport();
        f.index = this.funcs.length;
        f.name = name;
        this.funcs.push(f);
        return f;
    }
    declareGlobalVar(name, type) {
        let v = new ssa.Variable(name);
        v.type = type;
        v.readCount = 2; // Avoid that global variables are optimized away
        v.writeCount = 2;
        return v;
    }
    declareFunction(name) {
        let f = new Function();
        f.index = this.funcs.length;
        f.name = name;
        this.funcs.push(f);
        return f;
    }
    declareInitFunction(name) {
        let f = new Function();
        f.index = this.funcs.length;
        f.name = "init";
        this.funcs.push(f);
        this.initFunction = f;
        return f;
    }
    getInitFunction() {
        return this.initFunction;
    }
    defineFunction(n, f, isExported, isPossibleDuplicate) {
        if (!(f instanceof Function)) {
            throw "implementation error";
        }
        f.node = n;
    }
    generateModule(emitIR, initPackages, duplicateCodePackages) {
        let ircode = "";
        if (emitIR) {
            for (let f of this.funcs) {
                if (f instanceof Function) {
                    ircode += ssa.Node.strainToString("", f.node) + "\n";
                }
            }
        }
        return ircode;
    }
    //    addFunctionToTable(f: Function, index: number) {        
    //    }
    addInterfaceDescriptor(name, table) {
        return 0;
    }
    addSymbol(name) {
        return 0;
    }
}
exports.DummyBackend = DummyBackend;
//# sourceMappingURL=backend_dummy.js.map