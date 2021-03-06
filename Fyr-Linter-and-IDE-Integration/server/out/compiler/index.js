"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const program = require("commander");
const colors = require("colors");
const parser = require("./parser");
const typecheck = require("./typecheck");
const ast = require("./ast");
const pkg_1 = require("./pkg");
// Make TSC not throw out the colors lib
colors.red;
var pkgJson = JSON.parse(fs.readFileSync(path.join(path.dirname(module.filename), '../package.json'), 'utf8'));
function compileModules() {
    if (program.emitNative) {
        program.emitC = true;
    }
    if (program.emitC && program.emitWasm) {
        console.log(("Only one code emit path can be selected".red));
        return;
    }
    if (!program.emitC && !program.emitWasm && !program.emitIr) {
        program.disableCodegen = true;
    }
    var args = Array.prototype.slice.call(arguments, 0);
    if (args.length <= 1) {
        console.log(("Missing package or file information").red);
        return;
    }
    args = args.splice(args.length - 2, 1);
    let fyrPaths = pkg_1.Package.getFyrPaths();
    if (!fyrPaths) {
        return;
    }
    let pkg;
    // Compile a package?
    if (args.length == 1) {
        let p = path.resolve(args[0]);
        if (p[p.length - 1] != path.sep) {
            p += path.sep;
        }
        let isdir;
        try {
            isdir = fs.lstatSync(p).isDirectory();
        }
        catch (e) {
            isdir = false;
        }
        if (isdir) {
            // Is this package located in one of the known pathes. If yes -> put the output in the right location
            for (let fyrPath of fyrPaths) {
                let test = path.join(path.normalize(fyrPath), "src");
                if (test[test.length - 1] != path.sep) {
                    test += path.sep;
                }
                if (p.length > test.length && p.substr(0, test.length) == test) {
                    let pkgPath = p.substring(test.length, p.length - 1);
                    let packagePaths = pkgPath.split(path.sep);
                    packagePaths.splice(packagePaths.length - 1, 1);
                    pkg = new pkg_1.Package(true);
                    pkg.findSources(fyrPath, pkgPath);
                    break;
                }
            }
            // Not a package in one of the Fyr paths?
            if (!pkg) {
                // Determine all filenames
                let files = [];
                let allFiles = fs.readdirSync(p);
                for (let f of allFiles) {
                    if (f.length > 4 && f.substr(f.length - 4, 4) == ".fyr") {
                        files.push(path.join(p, f));
                    }
                }
                pkg = new pkg_1.Package(true);
                pkg.setSources(files);
            }
        }
    }
    // Compile a list of files?
    if (!pkg) {
        let files = [];
        // Determine all source files to compile
        for (let i = 0; i < args.length; i++) {
            let file = args[i];
            files.push(file);
        }
        pkg = new pkg_1.Package(true);
        pkg.setSources(files);
    }
    //    if (!program.disableRuntime) {
    //        files.push(path.join(fyrBase, "runtime/mem.fyr"));
    //        files.push(path.join(fyrBase, "runtime/map.fyr"));
    //    }
    // Load all sources
    try {
        pkg.loadSources("");
    }
    catch (ex) {
        if (ex instanceof typecheck.TypeError) {
            console.log((ex.location.file + " (" + ex.location.start.line + "," + ex.location.start.column + "): ").yellow + ex.message.red);
            return;
        }
        else if (ex instanceof parser.SyntaxError) {
            console.log((ast.currentFile() + " (" + ex.location.start.line + "," + ex.location.start.column + "): ").yellow + ex.message.red);
            return;
        }
        else if (ex instanceof pkg_1.ImportError) {
            if (ex.location) {
                console.log((ex.location.file + " (" + ex.location.start.line + "," + ex.location.start.column + "): ").yellow + ex.message.red);
            }
            else {
                console.log((ex.path + ": ".yellow) + ex.message.red);
            }
            return;
        }
        else {
            console.log(ex);
            throw ex;
        }
    }
    // TypeCheck the sources
    try {
        pkg_1.Package.checkTypesForPackages();
    }
    catch (ex) {
        if (ex instanceof typecheck.TypeError) {
            console.log((ex.location.file + " (" + ex.location.start.line + "," + ex.location.start.column + "): ").yellow + ex.message.red);
            return;
        }
        else {
            console.log(ex);
            throw ex;
        }
    }
    // Generate code
    if (!program.disableCodegen) {
        let backend = null;
        if (program.emitWasm) {
            backend = "WASM";
        }
        else if (program.emitC) {
            backend = "C";
        }
        try {
            // Errors can occur from loading runtime packages.
            pkg_1.Package.generateCodeForPackages(backend, program.emitIr, program.emitNative, program.disableNullCheck);
        }
        catch (ex) {
            if (ex instanceof typecheck.TypeError) {
                console.log((ex.location.file + " (" + ex.location.start.line + "," + ex.location.start.column + "): ").yellow + ex.message.red);
                return;
            }
            else if (ex instanceof parser.SyntaxError) {
                console.log((ast.currentFile() + " (" + ex.location.start.line + "," + ex.location.start.column + "): ").yellow + ex.message.red);
                return;
            }
            else if (ex instanceof pkg_1.ImportError) {
                if (ex.location) {
                    console.log((ex.location.file + " (" + ex.location.start.line + "," + ex.location.start.column + "): ").yellow + ex.message.red);
                }
                else {
                    console.log((ex.path + ": ".yellow) + ex.message.red);
                }
                return;
            }
            else {
                console.log(ex);
                throw ex;
            }
        }
    }
}
program
    .version(pkgJson.version, '-v, --version')
    .usage('[options] [command] <module ...>')
    .option('-r, --emit-ir', "Emit IR code")
    .option('-w, --emit-wasm', "Emit WASM code")
    .option('-c, --emit-c', "Emit C code")
    .option('-n, --emit-native', "Emit native executable")
    .option('-N, --disable-null-check', "Do not check for null pointers")
    .option('-T, --disable-runtime', "Do not include the standard runtime")
    .option('-G, --disable-codegen', "Do not generate any code, just perform syntax and typechecks");
program
    .command('compile')
    .description('Compile Fyr source code')
    .action(compileModules);
program.parse(process.argv);
//# sourceMappingURL=index.js.map