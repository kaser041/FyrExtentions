"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser = require("./compiler/parser");
class Compiler {
    constructor() { }
    compile(text) {
        try {
            text = text.replace(/\r/g, "");
            var parsed = parser.parse(text);
        }
        catch (e) {
            console.log("Exception caught : " + e);
            console.log(e.location.start.column);
            console.log(e.location.end.column);
            return true;
        }
        return false;
    }
}
exports.Compiler = Compiler;
//# sourceMappingURL=Compiler.js.map