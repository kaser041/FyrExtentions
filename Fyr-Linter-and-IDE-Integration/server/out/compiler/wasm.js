"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const textEncoding = require("text-encoding");
class Node {
}
exports.Node = Node;
let nameCounter = 0;
/**
 * In memory representation of a WASM module.
 */
class Module extends Node {
    constructor() {
        super(...arguments);
        this.funcIndex = 0;
        this.funcs = [];
        this.funcTable = [];
        this.funcTypes = [];
        this.funcImports = [];
        this.exports = new Map();
        // The first 8 bytes are always zero so that dereferencing a null string pointer yields a string of length zero.
        this.dataSize = 8;
        this.data = [];
        this.globals = [];
        this.funcTypeByCode = new Map();
        this.strings = new Map();
    }
    get op() {
        return "module";
    }
    toWast(indent) {
        let s = indent + "(module\n";
        for (let f of this.funcImports) {
            s += indent + "    (func $" + Module.escapeName(f.name) + " (import \"" + f.from + "\" \"" + f.name + "\") ";
            if (f.type.params.length > 0) {
                s += "(param";
                for (let t of f.type.params) {
                    s += " " + t.toString();
                }
                s += ") ";
            }
            if (f.type.results.length > 0) {
                s += "(result";
                for (let t of f.type.results) {
                    s += " " + t.toString();
                }
                s += ") ";
            }
            s += ")\n";
        }
        if (this.memoryImport) {
            s += indent + "    (import \"" + this.memoryImport.ns + "\" \"" + this.memoryImport.obj + "\" (memory " + Math.ceil((this.memorySize) / 65536).toString() + "))\n";
        }
        else {
            s += indent + "    (memory " + Math.ceil((this.memorySize) / 65536).toString() + ")\n";
        }
        for (let g of this.globals) {
            s += g.toWast(indent + "    ") + "\n";
        }
        for (let f of this.funcs.sort(function (a, b) { if (a.index == b.index)
            return 0; if (a.index < b.index)
            return -1; return 1; })) {
            s += f.toWast(indent + "    ") + "\n";
        }
        for (let d of this.data) {
            s += d.toWast(indent + "    ") + "\n";
        }
        // Export functions
        let index = this.funcs.length;
        for (let k of this.exports.keys()) {
            let v = this.exports.get(k);
            if (v instanceof Function) {
                if (!v.isExported) {
                    continue;
                }
                s += indent + "    (export \"" + k + "\" (func " + v.index.toString() + "))\n";
                index++;
            }
            else {
                throw "Implementation error";
            }
        }
        // Table section
        //        if (this.funcTable.length > 0) {
        s += indent + "    (table " + this.funcTable.length + " anyfunc)\n";
        for (let i = 0; i < this.funcTable.length; i++) {
            if (!this.funcTable[i]) {
                continue;
            }
            s += indent + "    (elem (i32.const " + i.toString() + ")";
            for (; i < this.funcTable.length && this.funcTable[i]; i++) {
                s += " " + this.funcTable[i].index.toString();
            }
            s += ")\n";
        }
        //        }
        // Function types
        for (let f of this.funcTypes) {
            s += indent + "    (type " + Module.escapeName(f.name) + " (func ";
            if (f.params.length > 0) {
                s += "(param";
                for (let t of f.params) {
                    s += " " + t.toString();
                }
                s += ") ";
            }
            if (f.results.length > 0) {
                s += "(result";
                for (let t of f.results) {
                    s += " " + t.toString();
                }
                s += ") ";
            }
            s += "))\n";
        }
        return s + indent + ")";
    }
    /**
     * Returns the memory offset and the size of the UTF-8 encoding in bytes.
     */
    addString(value) {
        if (this.strings.has(value)) {
            return this.strings.get(value);
        }
        // TODO: Align the start offset, not the size
        let uint8array = new textEncoding.TextEncoder("utf-8").encode(value);
        let offset = this.dataSize;
        let d = new StringData(offset, uint8array);
        this.data.push(d);
        this.dataSize += align64(d.size());
        this.strings.set(value, [offset, uint8array.length]);
        return [offset, uint8array.length];
    }
    addBinary(value) {
        let offset = this.dataSize;
        let d = new Data(offset, value);
        this.data.push(d);
        this.dataSize += align64(d.size());
        return offset;
    }
    addFunction(f) {
        f.index = this.funcIndex++;
        this.funcs.push(f);
    }
    setInitFunction(f) {
        if (this.initFunction) {
            throw "Duplicate init function";
        }
        f.index = this.funcIndex++;
        f.isInitFunction = true;
        this.initFunction = f;
        this.funcs.push(f);
    }
    addFunctionImport(f) {
        f.index = this.funcIndex++;
        this.funcImports.push(f);
    }
    importMemory(ns, obj) {
        this.memoryImport = { ns: ns, obj: obj };
    }
    addGlobal(g) {
        this.globals.push(g);
    }
    addGlobalStruct(size) {
        // TODO: Alignment
        let offset = this.dataSize;
        this.dataSize += align64(size);
        return offset;
    }
    defineGlobalStruct(offset, arr) {
        this.data.push(new Data(offset, arr));
    }
    textSize() {
        return align64(this.dataSize);
    }
    /**
     * Returns the name of the function type.
     */
    addFunctionType(params, results) {
        let code = params.join(",") + ";" + results.join(",");
        if (this.funcTypeByCode.has(code)) {
            return this.funcTypeByCode.get(code).name;
        }
        let ft = new FunctionType("$ftype_" + nameCounter.toString(), params, results);
        this.funcTypes.push(ft);
        this.funcTypeByCode.set(code, ft);
        return ft.name;
    }
    addFunctionToTable(f, index) {
        this.funcTable[index] = f;
    }
    static escapeName(name) {
        name = name.replace("_", "__");
        name = name.replace("<", "_lt");
        name = name.replace(">", "_gt");
        name = name.replace(",", "_.");
        return name;
    }
}
exports.Module = Module;
class FunctionImport {
    constructor(name, from, type) {
        this.name = name;
        this.from = from;
        this.type = type;
    }
    getIndex() {
        return this.index;
    }
    isImported() {
        return true;
    }
}
exports.FunctionImport = FunctionImport;
class FunctionType {
    constructor(name, params, results) {
        this.params = [];
        this.results = [];
        this.name = name;
        this.params = params;
        this.results = results;
    }
}
exports.FunctionType = FunctionType;
class Data extends Node {
    constructor(offset, value) {
        super();
        this.offset = offset;
        this.value = value;
    }
    get op() {
        return "data";
    }
    toWast(indent) {
        let v = "\"";
        for (let i = 0; i < this.value.length; i++) {
            v += "\\" + this.uint8ToHex(this.value[i]);
        }
        v += "\"";
        return indent + "(data (i32.const " + this.offset.toString() + ") " + v + ")";
    }
    size() {
        return this.value.length;
    }
    uint8ToHex(x) {
        let s = x.toString(16);
        if (s.length == 1) {
            return "0" + s;
        }
        return s;
    }
}
exports.Data = Data;
class StringData extends Data {
    constructor(offset, value) {
        super(offset, value);
    }
    toWast(indent) {
        let a32 = new Uint32Array([this.value.length]);
        let a8 = new Uint8Array(a32.buffer);
        let v = "\"\\" + this.uint8ToHex(a8[0]) + "\\" + this.uint8ToHex(a8[1]) + "\\" + this.uint8ToHex(a8[2]) + "\\" + this.uint8ToHex(a8[3]);
        for (let i = 0; i < this.value.length; i++) {
            v += "\\" + this.uint8ToHex(this.value[i]);
        }
        v += "\"";
        return indent + "(data (i32.const " + this.offset.toString() + ") " + v + ")";
    }
    size() {
        return 4 + this.value.length;
    }
}
exports.StringData = StringData;
class Function extends Node {
    constructor(name) {
        super();
        this.parameters = [];
        this.locals = [];
        this.results = [];
        this.statements = [];
        this.isInitFunction = false;
        this.isExported = false;
        //        if (!name) {
        //            this.name = "f" + nameCounter.toString();
        //            nameCounter++;
        //        } else {
        this.name = name;
        //        }
    }
    getIndex() {
        return this.index;
    }
    isImported() {
        return false;
    }
    get op() {
        return "function";
    }
    toWast(indent) {
        let s;
        if (this.isInitFunction || !this.name) {
            s = indent + "(func ";
        }
        else {
            s = indent + "(func $" + Module.escapeName(this.name);
        }
        for (let p of this.parameters) {
            s += " (param " + p + ")";
        }
        for (let p of this.results) {
            s += " (result " + p + ")";
        }
        for (let p of this.locals) {
            s += " (local " + p + ")";
        }
        s += "\n";
        let i = indent;
        for (let st of this.statements) {
            if (st.op == "end") {
                i = i.substr(0, i.length - 4);
            }
            else if (st.op == "else") {
                i = i.substr(0, i.length - 4);
            }
            s += st.toWast(i + "    ") + "\n";
            if (st.op == "block" || st.op == "loop" || st.op == "if" || st.op == "else") {
                i += "    ";
            }
        }
        s += indent + ")";
        if (this.isInitFunction) {
            s += "\n" + indent + "(start " + this.index.toString() + ")";
        }
        return s;
    }
}
exports.Function = Function;
class Constant extends Node {
    constructor(type, value) {
        super();
        this.type = type;
        this.value = value;
    }
    get op() {
        return this.type + ".const";
    }
    toWast(indent) {
        return indent + this.op + " " + this.value.toString();
    }
}
exports.Constant = Constant;
class Drop extends Node {
    get op() {
        return "drop";
    }
    toWast(indent) {
        return indent + "drop";
    }
}
exports.Drop = Drop;
class Select extends Node {
    get op() {
        return "select";
    }
    toWast(indent) {
        return indent + "select";
    }
}
exports.Select = Select;
class BinaryInstruction extends Node {
    constructor(type, op) {
        super();
        this.binaryOp = op;
        this.type = type;
    }
    get op() {
        return this.type + "." + this.binaryOp;
    }
    toWast(indent) {
        return indent + this.type + "." + this.binaryOp;
    }
}
exports.BinaryInstruction = BinaryInstruction;
class UnaryInstruction extends Node {
    constructor(type, op) {
        super();
        this.unaryOp = op;
        this.type = type;
    }
    get op() {
        return this.type + "." + this.unaryOp;
    }
    toWast(indent) {
        return indent + this.type + "." + this.unaryOp;
    }
}
exports.UnaryInstruction = UnaryInstruction;
/*
export type BinaryIntOp = "add" | "sub" | "mul" | "div_s" | "div_u" | "rem_s" | "rem_u" | "and" | "or" | "xor" | "shl" | "shr_u" | "shr_s" | "rotl" | "rotr" | "eq" | "neq" | "lt_s" | "lt_u" | "le_s" | "le_u" | "gt_s" | "gt_u" | "ge_s" | "ge_u";

export class BinaryIntInstruction extends Node {
    constructor(type: "i32" | "i64", op: BinaryIntOp) {
        super();
        this.intOp = op;
        this.type = type;
    }

    public get op(): string {
        return this.type + "." + this.intOp;
    }

    public toWast(indent: string): string {
        return indent + this.type + "." + this.intOp;
    }

    public type: "i32" | "i64";
    public intOp: BinaryIntOp;
}

export type UnaryIntOp = "eqz" | "clz" | "ctz" | "popcnt";

export class UnaryIntInstruction extends Node {
    constructor(type: "i32" | "i64", op: UnaryIntOp) {
        super();
        this.intOp = op;
        this.type = type;
    }

    public get op(): string {
        return this.type + "." + this.intOp;
    }

    public toWast(indent: string): string {
        return indent + this.type + "." + this.intOp;
    }

    public type: "i32" | "i64";
    public intOp: UnaryIntOp;
}

export type BinaryFloatOp = "add" | "sub" | "mul" | "div" | "eq" | "ne" | "le" | "lt" | "ge" | "gt" | "min" | "max";

export class BinaryFloatInstruction extends Node {
    constructor(type: "f32" | "f64", op: BinaryFloatOp) {
        super();
        this.intOp = op;
        this.type = type;
    }

    public get op(): string {
        return this.type + "." + this.intOp;
    }

    public toWast(indent: string): string {
        return indent + this.type + "." + this.intOp;
    }

    public type: "f32" | "f64";
    public intOp: BinaryFloatOp;
}

export type UnaryFloatOp = "neg" | "abs" | "copysign" | "ceil" | "floor" | "trunc" | "nearest" | "sqrt";

export class UnaryFloatInstruction extends Node {
    constructor(type: "f32" | "f64", op: UnaryFloatOp) {
        super();
        this.intOp = op;
        this.type = type;
    }

    public get op(): string {
        return this.type + "." + this.intOp;
    }

    public toWast(indent: string): string {
        return indent + this.type + "." + this.intOp;
    }

    public type: "f32" | "f64";
    public intOp: UnaryFloatOp;
}
*/
class Return extends Node {
    get op() {
        return "return";
    }
    toWast(indent) {
        return indent + "return";
    }
}
exports.Return = Return;
class GetLocal extends Node {
    constructor(index) {
        super();
        this.index = index;
    }
    get op() {
        return "get_local";
    }
    toWast(indent) {
        return indent + "get_local " + this.index.toString();
    }
}
exports.GetLocal = GetLocal;
class GetGlobal extends Node {
    constructor(index) {
        super();
        this.index = index;
    }
    get op() {
        return "get_global";
    }
    toWast(indent) {
        return indent + "get_global " + this.index.toString();
    }
}
exports.GetGlobal = GetGlobal;
class SetLocal extends Node {
    constructor(index) {
        super();
        this.index = index;
    }
    get op() {
        return "set_local";
    }
    toWast(indent) {
        return indent + "set_local " + this.index.toString();
    }
}
exports.SetLocal = SetLocal;
class TeeLocal extends Node {
    constructor(index) {
        super();
        this.index = index;
    }
    get op() {
        return "tee_local";
    }
    toWast(indent) {
        return indent + "tee_local " + this.index.toString();
    }
}
exports.TeeLocal = TeeLocal;
class SetGlobal extends Node {
    constructor(index) {
        super();
        this.index = index;
    }
    get op() {
        return "set_global";
    }
    toWast(indent) {
        return indent + "set_global " + this.index.toString();
    }
}
exports.SetGlobal = SetGlobal;
class Load extends Node {
    constructor(type, asType = null, offset = 0, align = null) {
        super();
        this.type = type;
        this.asType = asType;
        this.offset = offset;
        this.align = align;
    }
    get op() {
        return "load";
    }
    toWast(indent) {
        return indent + this.type + ".load" + (this.asType == null ? "" : this.asType) + (this.offset != 0 ? " offset=" + this.offset.toString() : "") + (this.align !== null ? " align=" + this.align.toString() : "");
    }
}
exports.Load = Load;
class Store extends Node {
    constructor(type, asType = null, offset = 0, align = null) {
        super();
        this.type = type;
        this.asType = asType;
        this.offset = offset;
        this.align = align;
    }
    get op() {
        return "store";
    }
    toWast(indent) {
        return indent + this.type + ".store" + (this.asType == null ? "" : this.asType) + (this.offset != 0 ? " offset=" + this.offset.toString() : "") + (this.align !== null ? " align=" + this.align.toString() : "");
    }
}
exports.Store = Store;
class If extends Node {
    constructor(blockType = null) {
        super();
        this.blockType = blockType;
    }
    get op() {
        return "if";
    }
    toWast(indent) {
        let s = indent + "if";
        if (this.blockType) {
            for (let st of this.blockType) {
                s += " " + st;
            }
        }
        return s;
    }
}
exports.If = If;
class Else extends Node {
    get op() {
        return "else";
    }
    toWast(indent) {
        return indent + "else";
    }
}
exports.Else = Else;
class Block extends Node {
    get op() {
        return "block";
    }
    toWast(indent) {
        return indent + "block";
    }
}
exports.Block = Block;
class Loop extends Node {
    get op() {
        return "loop";
    }
    toWast(indent) {
        return indent + "loop";
    }
}
exports.Loop = Loop;
class End extends Node {
    get op() {
        return "end";
    }
    toWast(indent) {
        return indent + "end";
    }
}
exports.End = End;
class Call extends Node {
    constructor(index) {
        super();
        this.index = index;
    }
    get op() {
        return "call";
    }
    toWast(indent) {
        return indent + "call " + this.index.toString();
    }
}
exports.Call = Call;
class CallIndirect extends Node {
    constructor(typeName) {
        super();
        this.typeName = typeName;
    }
    get op() {
        return "call_indirect";
    }
    toWast(indent) {
        return indent + "call_indirect " + this.typeName;
    }
}
exports.CallIndirect = CallIndirect;
class Br extends Node {
    constructor(depth) {
        super();
        this.depth = depth;
    }
    get op() {
        return "br";
    }
    toWast(indent) {
        return indent + "br " + this.depth.toString();
    }
}
exports.Br = Br;
class BrIf extends Node {
    constructor(depth) {
        super();
        this.depth = depth;
    }
    get op() {
        return "br_if";
    }
    toWast(indent) {
        return indent + "br_if " + this.depth.toString();
    }
}
exports.BrIf = BrIf;
class BrTable extends Node {
    constructor(depths) {
        super();
        this.depths = depths;
    }
    get op() {
        return "br_table";
    }
    toWast(indent) {
        return indent + "br_table " + this.depths.join(" ");
    }
}
exports.BrTable = BrTable;
class Wrap extends Node {
    get op() {
        return "wrap";
    }
    toWast(indent) {
        return indent + "i32.wrap/i64";
    }
}
exports.Wrap = Wrap;
class Extend extends Node {
    constructor(signed) {
        super();
        this.signed = signed;
    }
    get op() {
        return "extend";
    }
    toWast(indent) {
        return indent + "i64.extend" + (this.signed ? "_s" : "_u") + "/i32";
    }
}
exports.Extend = Extend;
class Promote extends Node {
    get op() {
        return "promote";
    }
    toWast(indent) {
        return indent + "f64.promote/f32";
    }
}
exports.Promote = Promote;
class Demote extends Node {
    get op() {
        return "demote";
    }
    toWast(indent) {
        return indent + "f32.demote/f64";
    }
}
exports.Demote = Demote;
class Convert extends Node {
    constructor(to, from, signed) {
        super();
        this.from = from;
        this.to = to;
        this.signed = signed;
    }
    get op() {
        return "convert";
    }
    toWast(indent) {
        return indent + this.to + ".convert" + (this.signed ? "_s/" : "_u/") + this.from;
    }
}
exports.Convert = Convert;
class Trunc extends Node {
    constructor(to, from, signed) {
        super();
        this.from = from;
        this.to = to;
        this.signed = signed;
    }
    get op() {
        return "trunc";
    }
    toWast(indent) {
        return indent + this.to + ".trunc" + (this.signed ? "_s/" : "_u/") + this.from;
    }
}
exports.Trunc = Trunc;
class Unreachable extends Node {
    get op() {
        return "unreachable";
    }
    toWast(indent) {
        return indent + "unreachable";
    }
}
exports.Unreachable = Unreachable;
class Comment extends Node {
    constructor(comment) {
        super();
        this.comment = comment;
    }
    get op() {
        return ";;";
    }
    toWast(indent) {
        return indent + ";; " + this.comment;
    }
}
exports.Comment = Comment;
class Global extends Node {
    constructor(type, name = null, mutable = true, initial = null) {
        super();
        this.type = type;
        this.name = name;
        this.mutable = mutable;
        this.initial = initial;
    }
    get op() {
        return "global";
    }
    toWast(indent) {
        let str = indent + "(global ";
        if (this.name) {
            str += this.name + " ";
        }
        if (this.mutable) {
            str += "(mut " + this.type.toString() + ") ";
        }
        else {
            str += this.type.toString() + " ";
        }
        if (this.initial === null) {
            str += "(" + this.type.toString() + ".const 0)";
        }
        else {
            str += "(\n";
            for (let n of this.initial) {
                str += n.toWast(indent + "    ") + "\n";
            }
            str += indent + ")";
        }
        str += ")";
        return str;
    }
}
exports.Global = Global;
class CurrentMemory extends Node {
    get op() {
        return "current_memory";
    }
    toWast(indent) {
        return indent + "current_memory";
    }
}
exports.CurrentMemory = CurrentMemory;
class GrowMemory extends Node {
    get op() {
        return "grow_memory";
    }
    toWast(indent) {
        return indent + "grow_memory";
    }
}
exports.GrowMemory = GrowMemory;
function align64(x) {
    return (x + 7) & -8;
}
//# sourceMappingURL=wasm.js.map