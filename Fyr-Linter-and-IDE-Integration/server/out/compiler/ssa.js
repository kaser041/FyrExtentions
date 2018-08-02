"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intSize = 4;
exports.ptrSize = 8;
exports.symbolType = "addr";
class PointerType {
    constructor(elementType, isConst) {
        this.elementType = elementType;
        this.isConst = isConst;
    }
}
exports.PointerType = PointerType;
class StructType {
    constructor() {
        // An array of type [name, type, count].
        this.fields = [];
        this.fieldOffsetsByName = new Map();
        this.size = 0;
        this.alignment = 1;
    }
    addField(name, type, count = 1) {
        let align = alignmentOf(type);
        this.alignment = Math.max(this.alignment, align);
        let alignOffset = (align - this.size % align) % align;
        this.size += alignOffset;
        let offset = this.size;
        this.fieldOffsetsByName.set(name, this.size);
        this.size += count * alignedSizeOf(type);
        this.fields.push([name, type, count]);
        return offset;
    }
    addFields(s) {
        for (let f of s.fields) {
            this.addField(f[0], f[1], f[2]);
        }
    }
    fieldOffset(name) {
        let offset = this.fieldOffsetsByName.get(name);
        if (offset === undefined) {
            throw "Implementation error " + name;
        }
        return offset;
    }
    fieldNameByIndex(index) {
        return this.fields[index][0];
    }
    fieldIndexByName(name) {
        for (var i = 0; i < this.fields.length; i++) {
            if (this.fields[i][0] == name) {
                return i;
            }
        }
        throw "Implementation error " + name;
    }
    toDetailedString() {
        let str = "{\n";
        for (let i = 0; i < this.fields.length; i++) {
            let f = this.fields[i];
            str += "    " + f[0] + " " + f[1] + " @" + this.fieldOffset(f[0]) + "\n";
        }
        str += "} size=" + this.size.toString();
        return str;
    }
    toString() {
        if (this.name) {
            return this.name;
        }
        return "struct{...}";
    }
}
exports.StructType = StructType;
function alignmentOf(x) {
    if (x instanceof StructType) {
        if (x.fields.length == 0) {
            return 1;
        }
        return x.alignment;
    }
    if (x instanceof PointerType) {
        return exports.ptrSize;
    }
    switch (x) {
        case "i8":
        case "s8":
            return 1;
        case "i16":
        case "s16":
            return 2;
        case "i32":
        case "s32":
        case "f32":
            return 4;
        case "addr":
        case "ptr":
            return exports.ptrSize;
        case "i64":
        case "s64":
        case "f64":
            return 8;
        case "int":
        case "sint":
            return exports.intSize;
    }
}
exports.alignmentOf = alignmentOf;
function isSigned(x) {
    return x == "s8" || x == "s16" || x == "s32" || x == "s64";
}
exports.isSigned = isSigned;
function sizeOf(x) {
    if (x instanceof StructType) {
        return x.size;
    }
    if (x instanceof PointerType) {
        return exports.ptrSize;
    }
    switch (x) {
        case "i8":
        case "s8":
            return 1;
        case "i16":
        case "s16":
            return 2;
        case "i32":
        case "s32":
        case "f32":
            return 4;
        case "addr":
        case "ptr":
            return exports.ptrSize;
        case "i64":
        case "s64":
        case "f64":
            return 8;
        case "int":
        case "sint":
            return exports.intSize;
    }
}
exports.sizeOf = sizeOf;
function alignedSizeOf(type) {
    let size = sizeOf(type);
    if (size == 0) {
        return 0;
    }
    let align = alignmentOf(type);
    return align * Math.ceil(size / align);
}
exports.alignedSizeOf = alignedSizeOf;
/*
export function hasPointers(t: Type | StructType | PointerType): boolean {
    if (t instanceof StructType) {
        for(let f of t.fields) {
            if (hasPointers(f[1])) {
                return true;
            }
        }
    } else if (t == "ptr") {
        return true;
    }
    return false;
}
*/
function compareTypes(t1, t2) {
    if (t1 == t2) {
        return true;
    }
    if (t1 instanceof StructType && t2 instanceof StructType) {
        if (t1.fields.length != t2.fields.length) {
            return false;
        }
        for (let i = 0; i < t1.fields.length; i++) {
            if (!compareTypes(t1.fields[i][1], t2.fields[i][1])) {
                return false;
            }
        }
        return true;
    }
    if (t1 instanceof PointerType && t2 instanceof PointerType) {
        return compareTypes(t1.elementType, t2.elementType);
    }
    return false;
}
exports.compareTypes = compareTypes;
class FunctionType {
    constructor(params, result, conv = "fyr") {
        this.callingConvention = "fyr";
        this.params = params;
        this.result = result;
        this.callingConvention = conv;
    }
    toString() {
        let str = "(" + this.params.map(function (t) { return t.toString(); }).join(",") + ")";
        str += " => (" + (this.result ? this.result.toString() : "") + ")";
        return str;
    }
    get stackFrame() {
        if (this._stackFrame) {
            return this._stackFrame;
        }
        this._stackFrame = new StructType();
        for (let i = 0; i < this.params.length; i++) {
            // Pointers as arguments must be passed on the stack
            if (this.params[i] instanceof StructType) {
                this._stackFrame.addField("$p" + i.toString(), this.params[i]);
            }
        }
        if (this.result instanceof StructType || this.isAsync()) {
            this._stackFrame.addField("$result", this.result);
        }
        // Add a field for the typemap if the stack is non-empty
        if (this._stackFrame.fields.length != 0) {
            this._stackFrame.addField("$typemapCall", "i32");
        }
        return this._stackFrame;
    }
    isAsync() {
        return this.callingConvention == "fyrCoroutine";
    }
}
exports.FunctionType = FunctionType;
class Variable {
    constructor(name) {
        /**
         * The number of times the value of the variable is used.
         */
        this.readCount = 0;
        /**
         * The number of times the variable is assigned a value.
         */
        this.writeCount = 0;
        /**
         * usedInMultupleSteps is true, if the variable is used in different 'steps'.
         * This is only meaningful when used after SMTransformation.transform().
         */
        this.usedInMultipleSteps = false;
        /**
         * isConstant is true if the variable is assigned exactly once
         * and this value is a constant.
         * The value is set by Optimizer.optimizeConstants() or by the code generation.
         */
        this.isConstant = false;
        /**
         * True if the variable is just a copy of another and hence just an artefact
         * created by the code generation layer.
         */
        this.isCopy = false;
        if (name) {
            this.name = name;
        }
        else {
            this.name = "%" + Variable.counter.toString();
            Variable.counter++;
        }
    }
    toString() {
        return this.name;
    }
}
Variable.counter = 0;
exports.Variable = Variable;
class Pointer {
    constructor(v, offset) {
        this.variable = v;
        this.offset = offset;
    }
}
exports.Pointer = Pointer;
class Node {
    constructor(assign, kind, type, args) {
        this.next = [];
        this.prev = [];
        this.args = [];
        this.isAsync = false;
        this.assign = assign;
        if (this.assign) {
            this.assignType = this.assign.type;
        }
        this.kind = kind;
        this.type = type;
        for (let a of args) {
            if (typeof (a) == "string") {
                this.args.push(new Variable(a));
            }
            else {
                this.args.push(a);
            }
        }
    }
    toString(indent) {
        let str = indent;
        if (this.assign instanceof Variable) {
            str += this.assign.toString() + " = ";
        }
        str += this.kind + " ";
        if (this.name) {
            str += this.name + " ";
        }
        if (this.type) {
            str += this.type.toString() + " ";
        }
        if (this.args.length > 0) {
            let names = this.args.map(function (v) {
                if (v instanceof Variable) {
                    return v.toString();
                }
                else if (v instanceof Node) {
                    return "(" + v.toString("") + ")";
                }
                else if (v === null || v === undefined) {
                    return "<null>";
                }
                else {
                    return v.toString();
                }
            });
            str += names.join(", ");
        }
        return str;
    }
    static strainToString(indent, n) {
        let str = "";
        for (; n && n.kind != "end";) {
            if (n.kind == "block" || n.kind == "loop" || n.kind == "define") {
                str += n.toString(indent) + "\n";
                str += Node.strainToString(indent + "    ", n.next[0]);
                str += indent + "end\n";
                n = n.blockPartner.next[0];
            }
            else if (n.kind == "if") {
                str += n.toString(indent) + "\n";
                str += Node.strainToString(indent + "    ", n.next[0]);
                if (n.next[1]) {
                    str += indent + "else\n";
                    str += Node.strainToString(indent + "    ", n.next[1]);
                }
                str += indent + "end\n";
                n = n.blockPartner.next[0];
            }
            else {
                str += n.toString(indent) + "\n";
                n = n.next[0];
            }
        }
        return str;
    }
    static insertBetween(n1, n2, newNode) {
        newNode.prev.push(n1);
        newNode.next.push(n2);
        for (let i = 0; i < n1.next.length; i++) {
            if (n1.next[i] == n2) {
                n1.next[i] = newNode;
                break;
            }
        }
        for (let i = 0; i < n2.prev.length; i++) {
            if (n2.prev[i] == n1) {
                n2.prev[i] = newNode;
                break;
            }
        }
    }
    static removeNode(n) {
        if (n.next.length > 1 || n.prev.length > 1) {
            throw "Cannot remove this node";
        }
        if (n.next.length == 1) {
            for (let i = 0; i < n.next[0].prev.length; i++) {
                if (n.next[0].prev[i] == n) {
                    n.next[0].prev[i] = n.prev[0];
                }
            }
        }
        if (n.prev.length == 1) {
            for (let i = 0; i < n.prev[0].next.length; i++) {
                if (n.prev[0].next[i] == n) {
                    n.prev[0].next[i] = n.next[0];
                }
            }
        }
        n.prev = [];
        n.next = [];
    }
}
exports.Node = Node;
class Builder {
    constructor() {
        this._blocks = [];
        this._mem = new Variable("$mem");
        this._mem.readCount = 2; // Just to prevent optimizations on this pseudo-variable
        this._mem.writeCount = 2;
    }
    define(name, type) {
        let n = new Node(null, "define", type, []);
        n.name = name;
        n.isAsync = type.callingConvention == "fyrCoroutine";
        if (this._current) {
            this._current.next.push(n);
            n.prev.push(this._current);
        }
        else {
            this._node = n;
        }
        this._current = n;
        this._blocks.push(n);
        let e = new Node(null, "end", undefined, []);
        e.blockPartner = n;
        n.blockPartner = e;
        this.countReadsAndWrites(n);
        return n;
    }
    declareParam(type, name) {
        let n = new Node(new Variable(name), "decl_param", type, []);
        n.assign.type = type;
        n.assignType = type;
        if (this._current) {
            this._current.next.push(n);
            n.prev.push(this._current);
        }
        else {
            this._node = n;
        }
        this._current = n;
        this.countReadsAndWrites(n);
        return n.assign;
    }
    declareResult(type, name) {
        let n = new Node(new Variable(name), "decl_result", type, []);
        n.assign.type = type;
        n.assignType = type;
        if (this._current) {
            this._current.next.push(n);
            n.prev.push(this._current);
        }
        else {
            this._node = n;
        }
        this._current = n;
        this.countReadsAndWrites(n);
        return n.assign;
    }
    declareVar(type, name) {
        let n = new Node(new Variable(name), "decl_var", type, []);
        n.assign.type = type;
        n.assignType = type;
        if (this._current) {
            this._current.next.push(n);
            n.prev.push(this._current);
        }
        else {
            this._node = n;
        }
        this._current = n;
        this.countReadsAndWrites(n);
        return n.assign;
    }
    assign(assign, kind, type, args) {
        let n = new Node(assign, kind, type, args);
        //        if (assign && assign.type && assign != this.mem) {
        //            if (!compareTypes(assign.type, type)) {
        //                fuck
        //                throw "Variable " + assign.name + " used with wrong type: " + assign.type + " " + type;
        //            }
        if (assign && !assign.type) {
            assign.type = type;
        }
        if (assign) {
            n.assignType = assign.type;
        }
        if (this._current) {
            this._current.next.push(n);
            n.prev.push(this._current);
        }
        else {
            this._node = n;
        }
        this._current = n;
        this.countReadsAndWrites(n);
        return n.assign;
    }
    call(assign, type, args) {
        let n = new Node(assign, "call", type, args);
        if (assign && assign.type) {
            if (!compareTypes(assign.type, type.result)) {
                throw "Variable " + assign.name + " used with wrong type";
            }
            n.assignType = assign.type;
        }
        else if (assign) {
            assign.type = type.result;
            n.assignType = assign.type;
        }
        else {
            n.assignType = type.result;
        }
        if (this._current) {
            this._current.next.push(n);
            n.prev.push(this._current);
        }
        else {
            this._node = n;
        }
        this._current = n;
        for (let b of this._blocks) {
            b.isAsync = b.isAsync || type.callingConvention == "fyrCoroutine";
        }
        this.countReadsAndWrites(n);
        return n.assign;
    }
    callIndirect(assign, type, args) {
        let n = new Node(assign, "call_indirect", type, args);
        if (assign && assign.type) {
            if (!compareTypes(assign.type, type.result)) {
                throw "Variable " + assign.name + " used with wrong type";
            }
        }
        else if (assign) {
            assign.type = type.result;
        }
        if (this._current) {
            this._current.next.push(n);
            n.prev.push(this._current);
        }
        else {
            this._node = n;
        }
        this._current = n;
        for (let b of this._blocks) {
            b.isAsync = b.isAsync || type.callingConvention == "fyrCoroutine";
        }
        this.countReadsAndWrites(n);
        return n.assign;
    }
    spawn(type, args) {
        let n = new Node(null, "spawn", type, args);
        if (this._current) {
            this._current.next.push(n);
            n.prev.push(this._current);
        }
        else {
            this._node = n;
        }
        this._current = n;
        this.countReadsAndWrites(n);
    }
    spawnIndirect(assign, type, args) {
        let n = new Node(assign, "spawn_indirect", type, args);
        if (assign && assign.type) {
            if (!compareTypes(assign.type, type.result)) {
                throw "Variable " + assign.name + " used with wrong type";
            }
        }
        else if (assign) {
            assign.type = type.result;
        }
        if (this._current) {
            this._current.next.push(n);
            n.prev.push(this._current);
        }
        else {
            this._node = n;
        }
        this._current = n;
        this.countReadsAndWrites(n);
        return n.assign;
    }
    br(to) {
        let j = 0;
        for (let i = this._blocks.length - 1; i >= 0; i--) {
            //            if (this._blocks[i].kind == "if" || this._blocks[i].kind == "define") {
            //                continue;
            //            }
            if (to == this._blocks[i]) {
                let n = new Node(null, "br", undefined, [j]);
                if (this._current) {
                    this._current.next.push(n);
                    n.prev.push(this._current);
                }
                else {
                    this._node = n;
                }
                n.blockPartner = to;
                this._current = n;
                return;
            }
            j++;
        }
        throw "Branch target is not reachable";
    }
    br_if(arg, to) {
        let j = 0;
        for (let i = this._blocks.length - 1; i >= 0; i--) {
            //            if (this._blocks[i].kind == "if" || this._blocks[i].kind == "define") {
            //                continue;
            //            }
            if (to == this._blocks[i]) {
                let n = new Node(null, "br_if", undefined, [arg, j]);
                if (this._current) {
                    this._current.next.push(n);
                    n.prev.push(this._current);
                }
                else {
                    this._node = n;
                }
                n.blockPartner = to;
                this._current = n;
                this.countReadsAndWrites(n);
                return;
            }
            j++;
        }
        throw "Branch target is not reachable";
    }
    /*
    public br_table(arg: Variable | string | number, to: Array<Node>) {
        let args: Array<Variable | string | number> = [arg];
        for(let t of to) {
            let ok = false;
            let j = 0;
            for(let i = this._blocks.length - 1; i >= 0; i--) {
                if (this._blocks[i].kind == "if" || this._blocks[i].kind == "define") {
                    continue;
                }
                if (t == this._blocks[i]) {
                    ok = true;
                    args.push(i);
                    break;
                }
            }
            if (!ok) {
                throw "Branch target is not reachable";
            }
        }
        let n = new Node([], "br_table", undefined, args);
        if (this._current) {
            this._current.next.push(n);
            n.prev.push(this._current);
        } else {
            this._node = n;
        }
        this._current = n;
    }
    */
    block() {
        let n = new Node(null, "block", undefined, []);
        if (this._current) {
            this._current.next.push(n);
            n.prev.push(this._current);
        }
        else {
            this._node = n;
        }
        this._current = n;
        this._blocks.push(n);
        let e = new Node(null, "end", undefined, []);
        e.blockPartner = n;
        n.blockPartner = e;
        return n;
    }
    loop() {
        let n = new Node(null, "loop", undefined, []);
        if (this._current) {
            this._current.next.push(n);
            n.prev.push(this._current);
        }
        else {
            this._node = n;
        }
        this._current = n;
        this._blocks.push(n);
        let e = new Node(null, "end", undefined, []);
        e.blockPartner = n;
        n.blockPartner = e;
        return n;
    }
    end() {
        if (this._blocks.length == 0) {
            throw "end without opening block";
        }
        let block = this._blocks.pop();
        let end = block.blockPartner;
        this._current.next.push(end);
        end.prev.push(this._current);
        this._current = end;
    }
    ifBlock(arg) {
        let n = new Node(null, "if", undefined, [arg]);
        if (this._current) {
            this._current.next.push(n);
            n.prev.push(this._current);
        }
        else {
            this._node = n;
        }
        this._current = n;
        this._blocks.push(n);
        let e = new Node(null, "end", undefined, []);
        e.blockPartner = n;
        n.blockPartner = e;
        this.countReadsAndWrites(n);
        return n;
    }
    elseBlock() {
        if (this._blocks.length == 0) {
            throw "end without opening block";
        }
        let n = this._blocks.pop();
        if (n.kind != "if") {
            throw "else without if";
        }
        this._blocks.push(n);
        this._current.next.push(n.blockPartner);
        n.blockPartner.prev.push(this._current);
        this._current = n;
    }
    tmp(t = null) {
        let v = new Variable();
        // v.isTemporary = true;
        v.type = t;
        return v;
    }
    get mem() {
        return this._mem;
    }
    get node() {
        return this._node;
    }
    countReadsAndWrites(n) {
        if (n.assign && n.kind != "decl_var") {
            n.assign.writeCount++;
            //            if (n.assign.isTemporary && n.assign.writeCount > 1) {
            //                throw "Variable " + n.assign.name + " is temporary but assigned more than once";
            //            }
        }
        for (let v of n.args) {
            if (v instanceof Variable) {
                v.readCount++;
            }
        }
        if (n.kind == "addr_of" && n.args[0] instanceof Variable) {
            n.args[0].addressable = true;
        }
        else if (n.kind == "decl_param" || n.kind == "decl_result") {
            n.assign.readCount = 1; // Avoid that assignments to the variable are treated as dead code
        }
    }
}
exports.Builder = Builder;
class Optimizer {
    optimizeConstants(n) {
        this._optimizeConstants(n, n.blockPartner);
    }
    /**
     * Removes all 'const' nodes which assign to variables that are SSA.
     */
    _optimizeConstants(start, end) {
        let n = start;
        for (; n && n != end;) {
            if (n.kind == "if") {
                if (n.next.length > 1) {
                    this._optimizeConstants(n.next[1], n.blockPartner);
                }
            }
            if (n.kind == "const" && n.assign.writeCount == 1 && !n.assign.addressable) {
                n.assign.isConstant = true;
                n.assign.constantValue = n.args[0];
                let n2 = n.next[0];
                Node.removeNode(n);
                n = n2;
            }
            else {
                /*  for(let i = 0; i < n.args.length; i++) {
                      let a = n.args[i];
                      if (a instanceof Variable && a.isConstant && typeof(a.constantValue) == "number") {
                          n.args[i] = a.constantValue;
                      }
                  } */
                n = n.next[0];
            }
            // TODO: Computations on constants can be optimized
        }
    }
    removeDeadCode(n) {
        this._removeDeadCode1(n.blockPartner, n);
        this._removeDeadCode2(n, n.blockPartner);
    }
    /**
     * Traverse the code backwards and remove assignment which assign to variables
     * that are never read.
     */
    _removeDeadCode1(n, end) {
        for (; n && n != end;) {
            if (n.assign && n.assign.isCopy) {
                n.assign.writeCount--;
                n.assign = n.assign.copiedValue;
                n.assign.writeCount++;
            }
            // Remove assignments to variables which are not read
            if ((n.kind == "call" || n.kind == "call_indirect") && n.assign && n.assign.readCount == 0) {
                n.assign.writeCount--;
                n.assign = null;
            }
            else if (n.kind == "end" && n.prev[1]) { // The 'end' belongs to an 'if'?
                this._removeDeadCode1(n.prev[1], n.blockPartner);
            }
            else if (n.kind == "decl_param" || n.kind == "decl_result" || n.kind == "decl_var" || n.kind == "return") {
                // Do nothing by intention
            }
            else if (n.kind == "copy" && n.args[0] instanceof Variable && n.args[0].writeCount == 1 && n.args[0].readCount == 1) {
                let v = n.args[0];
                v.isCopy = true;
                v.copiedValue = n.assign;
                n.assign.writeCount--;
                v.readCount--;
                let n2 = n.prev[0];
                Node.removeNode(n);
                n = n2;
                continue;
            }
            else if (n.kind == "copy" && typeof (n.args[0]) == "number") {
                n.kind = "const";
            }
            else if ((n.kind != "call" && n.kind != "call_indirect" && n.kind != "spawn" && n.kind != "spawn_indirect") && n.assign && n.assign.readCount == 0) {
                let n2 = n.prev[0];
                for (let a of n.args) {
                    if (a instanceof Variable) {
                        a.readCount--;
                    }
                }
                n.assign.writeCount--;
                Node.removeNode(n);
                n = n2;
                continue;
            }
            n = n.prev[0];
        }
    }
    /**
     * Traverse the code forwards and eliminate unreachable code
     */
    _removeDeadCode2(n, end) {
        let dead = false;
        for (; n && n != end;) {
            if (dead) {
                this.removeDeadNode(n);
                let n2 = n.next[0];
                Node.removeNode(n);
                n = n2;
                continue;
            }
            if (n.kind == "return" || n.kind == "br") {
                dead = true;
            }
            if (n.kind == "if") {
                if (typeof (n.args[0]) == "number") {
                    let val = n.args[0];
                    if (n.next[1]) {
                        if (!val) {
                            let next = n.next[1];
                            n.next[1] = n.next[0];
                            n.next[0] = next;
                            let end = n.blockPartner.prev[1];
                            n.blockPartner.prev[1] = n.blockPartner.prev[0];
                            n.blockPartner.prev[0] = end;
                        }
                        let n2 = n.blockPartner.next[0];
                        this.removeDeadStrain(n.next[1], n.blockPartner);
                        n.next.splice(1, 1);
                        n.blockPartner.prev.splice(1, 1);
                        this.removeDeadNode(n);
                        Node.removeNode(n.blockPartner);
                        Node.removeNode(n);
                        n = n2;
                    }
                    else {
                        if (!val) {
                            let n2 = n.blockPartner.next[0];
                            this.removeDeadStrain(n.next[0], n.blockPartner);
                            this.removeDeadNode(n);
                            let end = n.blockPartner;
                            for (let x = n; x != end;) {
                                let x2 = x.next[0];
                                Node.removeNode(x);
                                x = x2;
                            }
                            Node.removeNode(n.blockPartner);
                            Node.removeNode(n);
                            n = n2;
                        }
                        else {
                            let n2 = n.next[0];
                            if (n2 == n.blockPartner) {
                                n2 = n2.next[0];
                            }
                            Node.removeNode(n.blockPartner);
                            Node.removeNode(n);
                            n = n2;
                        }
                    }
                    continue;
                }
                else {
                    this._removeDeadCode2(n.next[0], n.blockPartner);
                    if (n.next[1]) {
                        this._removeDeadCode2(n.next[1], n.blockPartner);
                    }
                    n = n.blockPartner;
                }
            }
            else if (n.kind == "block" || n.kind == "loop") {
                this._removeDeadCode2(n.next[0], n.blockPartner);
                n = n.blockPartner;
            }
            n = n.next[0];
        }
    }
    removeDeadStrain(n, end) {
        for (; n && n != end;) {
            let n2 = n.next[0];
            this.removeDeadNode(n);
            n = n2;
        }
    }
    removeDeadNode(n) {
        for (let a of n.args) {
            if (a instanceof Variable) {
                a.readCount--;
            }
        }
        if (n.assign) {
            n.assign.writeCount--;
        }
        if (n.kind == "if" && n.next[1]) {
            this.removeDeadStrain(n.next[1], n.blockPartner);
        }
    }
    analyzeGCDiscoverability(n) {
        let varsRead = new Set();
        this._analyzeGCDiscoverability(n, null, varsRead);
    }
    /**
     * The function traverses the code in reverse order and collects all variables of type "ptr" that are assigned before and read
     * after a GC happens. Thus, the object being pointed to is still in use and must be detectable by the GC.
     */
    _analyzeGCDiscoverability(n, stop, varsRead) {
        let doesGC = false;
        for (; n != stop;) {
            if (n.kind == "end" && n.blockPartner.kind == "if") {
                let r = new Set();
                for (let v of varsRead) {
                    r.add(v);
                }
                let branchDoesGC = this._analyzeGCDiscoverability(n.prev[0], n.blockPartner, r);
                doesGC = doesGC || branchDoesGC;
                if (n.prev[1]) {
                    branchDoesGC = this._analyzeGCDiscoverability(n.prev[1], n.blockPartner, r);
                    doesGC = doesGC || branchDoesGC;
                }
                for (let v of r) {
                    varsRead.add(v);
                }
                n = n.blockPartner;
            }
            else if (n.kind == "end" && (n.blockPartner.kind == "block" || n.blockPartner.kind == "loop")) {
                let blockDoesGC = this._analyzeGCDiscoverability(n.prev[0], n.blockPartner, varsRead);
                if (n.blockPartner.kind == "loop") {
                    // Run once again to see what happens in this case
                    this._analyzeGCDiscoverability(n.prev[0], n.blockPartner, varsRead);
                }
                doesGC = doesGC || blockDoesGC;
                n = n.blockPartner;
            }
            else if (n.kind == "decl_var" || n.kind == "decl_result" || n.kind == "decl_param") {
                n = n.prev[0];
            }
            else {
                if (n.kind == "alloc" || n.kind == "call" || n.kind == "call_indirect" || n.kind == "call_end" || n.kind == "call_begin" || n.kind == "call_indirect_begin") {
                    if (n.assign && n.assign.type == "ptr") {
                        // The varible is written.
                        // If a GC happens before, there is no need to need to inspect this variable.
                        varsRead.delete(n.assign);
                    }
                    // Call might trigger the GC. All variables read AFTER the call must necessarily be assigned BEFORE the call.
                    // Hence, the objects these variables are pointing to need to survive this GC.
                    for (let v of varsRead) {
                        v.gcDiscoverable = true;
                    }
                    doesGC = true;
                }
                let argDoesGC = false;
                let doesGCBefore = doesGC;
                for (let i = n.args.length - 1; i >= 0; i--) {
                    let a = n.args[i];
                    // If a ptr is computed for a "store" and then a value is computed leading to a GC, the ptr must be GC discoverable
                    if (i == 0 && n.kind == "store" && doesGC && !doesGCBefore) {
                        if (a instanceof Variable && a.type == "ptr") {
                            a.gcDiscoverable = true;
                        }
                        else if (a instanceof Node && a.assignType == "ptr") {
                            if (a.assign) {
                                a.assign.gcDiscoverable = true;
                            }
                            else {
                                a.assign = new Variable();
                                a.assign.type = "ptr";
                                a.assign.gcDiscoverable = true;
                            }
                        }
                    }
                    if (a instanceof Node) {
                        let gc = this._analyzeGCDiscoverability(a, null, varsRead);
                        doesGC = doesGC || gc;
                        if (argDoesGC && a.assignType == "ptr") {
                            if (a.assign) {
                                a.assign.gcDiscoverable = true;
                            }
                            else {
                                a.assign = new Variable();
                                a.assign.type = "ptr";
                                a.assign.gcDiscoverable = true;
                            }
                        }
                        argDoesGC = argDoesGC || gc;
                    }
                    else if (a instanceof Variable && a.type == "ptr") {
                        if (argDoesGC) {
                            // If the value of the variable is a pointer and put on the WASM stack and GC happens before the value of the var is consumed,
                            // then the variable must be GC discoverable, since the value on the WASM stack is not discoverable.
                            a.gcDiscoverable = true;
                        }
                        else {
                            varsRead.add(a);
                        }
                    }
                }
                // If the assigned variable has not yet been read, then it must be inside a loop,
                // otherwise the variable would be useless and would have been removed.
                // If GC happens after this assignment, GC discoverability is required.
                // if (n.assign && n.assign.type == "ptr" && !varsRead.has(n.assign) && doesGC) {
                //                    n.assign.gcDiscoverable = true;
                if (n.assign && n.assign.type == "ptr") {
                    // The varible is written.
                    // If a GC happens before, there is no need to need to inspect this variable.
                    varsRead.delete(n.assign);
                }
                n = n.prev[0];
            }
        }
        return doesGC;
    }
}
exports.Optimizer = Optimizer;
/**
 * Transforms control flow with loop/block/br/br_if/if into a state machine using
 * step/goto_step/goto_step_if. This happens in all places where execution could block.
 * Non-blocking constructs are left untouched.
 */
class SMTransformer {
    constructor() {
        this.stepCounter = 0;
    }
    transform(startBlock) {
        if (!startBlock.isAsync) {
            return;
        }
        this.transformUpTo(startBlock, startBlock.blockPartner, null, false);
        this.insertNextStepsUpTo(startBlock, startBlock.blockPartner);
        this.cleanup(startBlock);
    }
    /**
     * Transforms the control flow from block/loop/if/br/br_if/end into a state machine.
     * Therefore, the function inserts step, goto_step and goto_step_if nodes.
     */
    transformUpTo(startBlock, endNode, step, elseClause) {
        let n = startBlock;
        if (n.kind == "define") {
            n = n.next[0];
        }
        for (; n;) {
            if (n.kind == "block" || n.kind == "loop") {
                if (n.isAsync) {
                    if (step) {
                        let end = new Node(null, "goto_step", undefined, []);
                        step = null;
                        Node.insertBetween(n.prev[0], n, end);
                    }
                    n = n.next[0];
                }
                else {
                    // Step behind n
                    n = n.blockPartner.next[0];
                }
            }
            else if (n.kind == "if") {
                if (n.isAsync) {
                    if (!step) {
                        step = new Node(null, "step", undefined, []);
                        step.name = "s" + this.stepCounter.toString();
                        this.stepCounter++;
                        Node.insertBetween(n.prev[0], n, step);
                    }
                    // Create steps on the else branch
                    if (n.next[1]) {
                        this.transformUpTo(n.next[1], n.blockPartner, step, true);
                    }
                    n = n.next[0];
                }
                else {
                    // Step behind n
                    n = n.blockPartner.next[0];
                }
            }
            else if (n.kind == "end") {
                if (step) {
                    if (n.blockPartner.kind != "if" && n.prev[0].kind == "return") {
                        // Do nothing by intention
                        step = null;
                    }
                    else {
                        let end = new Node(null, "goto_step", undefined, []);
                        step = null;
                        Node.insertBetween(n.prev[elseClause ? 1 : 0], n, end);
                    }
                }
                if (n == endNode) {
                    n = null;
                    break;
                }
                n = n.next[0];
            }
            else {
                if (!step) {
                    step = new Node(null, "step", undefined, []);
                    step.name = "s" + this.stepCounter.toString();
                    this.stepCounter++;
                    Node.insertBetween(n.prev[0], n, step);
                }
                if (n.kind == "br") {
                    n.kind = "goto_step";
                    n.args = [];
                    if (n.blockPartner.kind == "loop") {
                        n.blockPartner = n.blockPartner;
                    }
                    else {
                        // n.blockPartner points to 'block'
                        // n.blockPartner.blockPartner points to the corresponding 'end'.
                        // That is where we must go. Later this is adjusted to the destination step.
                        n.blockPartner = n.blockPartner.blockPartner;
                    }
                    step = null;
                    n = n.next[0];
                }
                else if (n.kind == "br_if") {
                    n.kind = "goto_step_if";
                    n.args.splice(1, 1);
                    if (n.blockPartner.kind == "loop") {
                        n.blockPartner = n.blockPartner;
                    }
                    else {
                        n.blockPartner = n.blockPartner.blockPartner;
                    }
                    n = n.next[0];
                }
                else if ((n.kind == "call" || n.kind == "call_indirect") && n.type.callingConvention == "fyrCoroutine") {
                    n.kind = n.kind == "call" ? "call_begin" : "call_indirect_begin";
                    let result = new Node(n.assign, "call_end", n.type, []);
                    n.assign = null;
                    let end = new Node(null, "goto_step", undefined, []);
                    step = null;
                    Node.insertBetween(n, n.next[0], end);
                    Node.insertBetween(end, end.next[0], result);
                    n = result;
                }
                else if (n.kind == "yield") {
                    let end = new Node(null, "goto_step", undefined, []);
                    step = null;
                    Node.insertBetween(n, n.next[0], end);
                    n = end.next[0];
                }
                else {
                    n = n.next[0];
                }
            }
        }
    }
    nextStep(n) {
        for (; n;) {
            if (n.kind == "step") {
                return n;
            }
            n = n.next[0];
        }
        return null;
    }
    /**
     * Determines the destination step of goto_step and goto_step_if.
     */
    insertNextStepsUpTo(start, end) {
        let n = start;
        for (; n;) {
            if (n.kind == "goto_step" || n.kind == "goto_step_if") {
                let f = this.nextStep(n.blockPartner ? n.blockPartner : n);
                // Point to the destination step
                n.blockPartner = f;
                if (f) {
                    n.name = f.name;
                }
                else {
                    n.name = "<end>";
                }
                n = n.next[0];
            }
            else if (n.kind == "if" && n.next.length > 1) {
                this.insertNextStepsUpTo(n.next[1], n.blockPartner);
                n = n.next[0];
            }
            else {
                n = n.next[0];
            }
        }
    }
    /**
     * Removes unnecessary block, loop and end nodes.
     */
    cleanup(n) {
        for (; n;) {
            if (n.kind == "if" && n.next.length > 1) {
                this.cleanup(n.next[1]);
                n = n.next[0];
            }
            else if ((n.isAsync && (n.kind == "block" || n.kind == "loop") || (n.kind == "end" && n.blockPartner.isAsync && n.blockPartner.kind != "if"))) {
                let n2 = n.next[0];
                Node.removeNode(n);
                n = n2;
            }
            else {
                n = n.next[0];
            }
        }
    }
}
exports.SMTransformer = SMTransformer;
class Stackifier {
    constructor(optimizer) {
        this.optimizer = optimizer;
    }
    stackifyStep(start, end) {
        let n = start.next[0];
        let last;
        for (; n && n != end;) {
            last = n;
            if (n.kind == "addr_of") {
                n = n.next[0];
            }
            else {
                if (n.kind == "if" && n.next[1]) {
                    this.stackifyStep(n.next[1], n.blockPartner);
                }
                let doNotInline = [];
                let assigned = new Map();
                for (let i = 0; i < n.args.length; i++) {
                    let a = n.args[i];
                    if (a instanceof Variable && a.readCount == 1) {
                        // Try to inline the computation
                        let inline = this.findInline(n.prev[0], a, doNotInline, assigned);
                        if (inline && (inline.kind != "call_end" || (n.kind == "return" && n.args.length == 0) || n.kind == "store")) {
                            inline.assign.readCount--;
                            inline.assign.writeCount--;
                            inline.assign = null;
                            n.args[i] = inline;
                            Node.removeNode(inline);
                        }
                        /*                    } else if (a instanceof Variable && a.writeCount == 1) {
                                                // Try to inline the computation
                                                let inline = this.findInlineForMultipleReads(n.prev[0], a, doNotInline, assigned);
                                                if (inline && (inline.kind != "call_end" || (n.kind == "return" && n.args.length == 0) || n.kind == "store")) {
                                                    inline.assign.readCount--;
                                                    n.args[i] = inline;
                                                    Node.removeNode(inline);
                                                }*/
                    }
                    if (a instanceof Variable) {
                        doNotInline.push(a);
                    }
                    else if (a instanceof Node) {
                        this.collectAssignments(a, null, assigned);
                    }
                }
                if (n.kind == "step" || n.kind == "goto_step") {
                    break;
                }
                n = n.next[0];
            }
        }
        // If end of function has been reached, traverse the code in reverse order
        // to mark variables that need to be visible to the GC
        if (end === null) {
            this.optimizer.analyzeGCDiscoverability(last);
        }
    }
    findInline(n, v, doNotInline, assigned) {
        for (; n;) {
            if (n.kind == "step" || n.kind == "goto_step" || n.kind == "goto_step_if" || n.kind == "br" || n.kind == "br_if" || n.kind == "if" || n.kind == "block" || n.kind == "loop" || n.kind == "end" || n.kind == "return") {
                return null;
            }
            if (n.assign == v) {
                if (n.kind == "decl_param" || n.kind == "decl_result" || n.kind == "decl_var") {
                    return null;
                }
                if (this.assignsToVariable(n, doNotInline)) {
                    return null;
                }
                if (this.readsFromVariables(n, assigned)) {
                    return null;
                }
                return n;
            }
            else if (n.assign) {
                if (this.collectAssignments(n, v, assigned)) {
                    return null;
                }
            }
            if (this.doNotByPassForInline(n)) {
                return null;
            }
            n = n.prev[0];
        }
        return null;
    }
    /**
     * Like 'findInline' but is assures that the variable assigned by the returned node is not
     * read between 'n' and its assignment.
     * The variable assignment can then be inlined with a tee.
     */
    findInlineForMultipleReads(n, v, doNotInline, assigned) {
        for (; n;) {
            if (n.kind == "step" || n.kind == "goto_step" || n.kind == "goto_step_if" || n.kind == "br" || n.kind == "br_if" || n.kind == "if" || n.kind == "block" || n.kind == "loop" || n.kind == "end" || n.kind == "return") {
                return null;
            }
            if (this.readsFromVariable(n, v)) {
                return null;
            }
            if (n.assign == v) {
                if (n.kind == "decl_param" || n.kind == "decl_result" || n.kind == "decl_var") {
                    return null;
                }
                if (this.assignsToVariable(n, doNotInline)) {
                    return null;
                }
                if (this.readsFromVariables(n, assigned)) {
                    return null;
                }
                return n;
            }
            else if (n.assign) {
                if (this.collectAssignments(n, v, assigned)) {
                    return null;
                }
            }
            if (this.doNotByPassForInline(n)) {
                return null;
            }
            n = n.prev[0];
        }
        return null;
    }
    collectAssignments(n, v, assigned) {
        if (n.assign) {
            if (n.assign == v) {
                return true;
            }
            if (!assigned.has(n.assign)) {
                assigned.set(n.assign, true);
            }
            for (let a of n.args) {
                if (a instanceof Node) {
                    if (this.collectAssignments(a, v, assigned)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    assignsToVariable(n, vars) {
        if (vars.indexOf(n.assign) != -1) {
            return true;
        }
        for (let a of n.args) {
            if (a instanceof Node) {
                if (this.assignsToVariable(a, vars)) {
                    return true;
                }
            }
        }
        return false;
    }
    readsFromVariable(n, v) {
        for (let a of n.args) {
            if (a instanceof Variable && a == v) {
                return true;
            }
            else if (a instanceof Node) {
                if (this.readsFromVariable(a, v)) {
                    return true;
                }
            }
        }
        return false;
    }
    readsFromVariables(n, vars) {
        for (let a of n.args) {
            if (a instanceof Variable && vars.has(a)) {
                return true;
            }
            else if (a instanceof Node) {
                if (this.readsFromVariables(a, vars)) {
                    return true;
                }
            }
        }
        return false;
    }
    doNotByPassForInline(n) {
        if (n.kind == "call" || n.kind == "decref") {
            return true;
        }
        for (let a of n.args) {
            if (a instanceof Node) {
                if (this.doNotByPassForInline(a)) {
                    return true;
                }
            }
        }
        return false;
    }
}
exports.Stackifier = Stackifier;
//# sourceMappingURL=ssa.js.map