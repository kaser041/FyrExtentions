"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _currentFile;
function setCurrentFile(f) {
    _currentFile = f;
}
exports.setCurrentFile = setCurrentFile;
function currentFile() {
    return _currentFile;
}
exports.currentFile = currentFile;
var AstFlags;
(function (AstFlags) {
    AstFlags[AstFlags["None"] = 0] = "None";
    AstFlags[AstFlags["ZeroAfterAssignment"] = 1] = "ZeroAfterAssignment";
    AstFlags[AstFlags["ReferenceObjectMember"] = 2] = "ReferenceObjectMember";
})(AstFlags = exports.AstFlags || (exports.AstFlags = {}));
class Node {
    constructor(config) {
        if (config) {
            if (config.op !== undefined) {
                this.op = config.op;
            }
            if (config.lhs !== undefined) {
                this.lhs = config.lhs;
            }
            if (config.rhs !== undefined) {
                this.rhs = config.rhs;
            }
            if (config.value !== undefined) {
                this.value = config.value;
            }
            if (config.numValue !== undefined) {
                this.numValue = config.numValue;
            }
            if (config.name !== undefined) {
                this.name = config.name;
            }
            if (config.loc !== undefined) {
                this.loc = config.loc;
            }
            if (config.comments !== undefined) {
                this.comments = config.comments;
            }
            if (config.condition !== undefined) {
                this.condition = config.condition;
            }
            if (config.statements !== undefined) {
                this.statements = config.statements;
            }
            if (config.elseBranch !== undefined) {
                this.elseBranch = config.elseBranch;
            }
            if (config.parameters !== undefined) {
                this.parameters = config.parameters;
            }
            if (config.genericParameters !== undefined) {
                this.genericParameters = config.genericParameters;
            }
            if (config.groupName !== undefined) {
                this.groupName = config.groupName;
            }
            if (config.flags !== undefined) {
                this.flags = config.flags;
            }
            if (config.nspace !== undefined) {
                this.nspace = config.nspace;
            }
        }
    }
    stringify(prefix) {
        let str = "";
        if (this.comments) {
            for (let c of this.comments) {
                str += prefix + "// " + c.value + "\n";
            }
        }
        str += prefix + this.op + (this.value !== undefined ? " " + this.value : "") + "\n";
        if (this.name) {
            str += prefix + "-name:" + "\n" + this.name.stringify(prefix + "  ");
        }
        if (this.genericParameters) {
            str += prefix + "-genericParameters:" + "\n";
            for (let s of this.genericParameters) {
                str += s.stringify(prefix + "  ");
            }
        }
        if (this.parameters) {
            str += prefix + "-parameters:" + "\n";
            for (let s of this.parameters) {
                str += s.stringify(prefix + "  ");
            }
        }
        if (this.lhs) {
            str += prefix + "-lhs:" + "\n" + this.lhs.stringify(prefix + "  ");
        }
        if (this.condition) {
            str += prefix + "-condition:" + "\n" + this.condition.stringify(prefix + "  ");
        }
        if (this.rhs) {
            str += prefix + "-rhs:" + "\n" + this.rhs.stringify(prefix + "  ");
        }
        if (this.statements) {
            str += prefix + "-statements:" + "\n";
            for (let s of this.statements) {
                str += s.stringify(prefix + "  ");
            }
        }
        if (this.elseBranch) {
            str += prefix + "-elseBranch:" + "\n" + this.elseBranch.stringify(prefix + "  ");
        }
        return str;
    }
    isUnifyableLiteral() {
        if (this.op == "int" || this.op == "float" || this.op == "str") {
            return true;
        }
        if (this.op == "array" || this.op == "object" || this.op == "tuple") {
            if (this.lhs) { // a typed literal?
                return false;
            }
            return true;
        }
        if (this.op == "unary&" && this.rhs.isUnifyableLiteral()) {
            return true;
        }
        return false;
    }
    clone() {
        let n = new Node();
        n.op = this.op;
        n.value = this.value;
        n.numValue = this.numValue;
        n.loc = this.loc;
        n.comments = this.comments;
        n.type = this.type;
        n.nspace = this.nspace;
        n.scope = this.scope;
        n.scopeExit = this.scopeExit;
        n.lhs = this.lhs ? this.lhs.clone() : null;
        n.rhs = this.rhs ? this.rhs.clone() : null;
        n.name = this.name ? this.name.clone() : null;
        n.condition = this.condition ? this.condition.clone() : null;
        n.elseBranch = this.elseBranch ? this.elseBranch.clone() : null;
        if (this.statements) {
            n.statements = [];
            for (let s of this.statements) {
                n.statements.push(s.clone());
            }
        }
        if (this.parameters) {
            n.parameters = [];
            for (let s of this.parameters) {
                n.parameters.push(s.clone());
            }
        }
        if (this.genericParameters) {
            n.genericParameters = [];
            for (let s of this.genericParameters) {
                n.genericParameters.push(s.clone());
            }
        }
        n.groupName = this.groupName ? this.groupName.clone() : null;
        n.flags = this.flags;
        return n;
    }
}
exports.Node = Node;
//# sourceMappingURL=ast.js.map