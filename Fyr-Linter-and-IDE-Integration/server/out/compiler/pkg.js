"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const process = require("process");
const fs = require("fs");
const child_process = require("child_process");
const os = require("os");
const tc = require("./typecheck");
const parser = require("./parser");
const ast = require("./ast");
const typecheck_1 = require("./typecheck");
const codegen_1 = require("./codegen");
const backend_wasm_1 = require("./backend_wasm");
const backend_c_1 = require("./backend_c");
const backend_dummy_1 = require("./backend_dummy");
const typecheck = require("./typecheck");
var SystemCalls;
(function (SystemCalls) {
    SystemCalls[SystemCalls["heap"] = -1] = "heap";
    SystemCalls[SystemCalls["currentMemory"] = -2] = "currentMemory";
    SystemCalls[SystemCalls["growMemory"] = -3] = "growMemory";
    SystemCalls[SystemCalls["heapTypemap"] = -4] = "heapTypemap";
    SystemCalls[SystemCalls["pageSize"] = -5] = "pageSize";
    // Returns the default size for a stack
    SystemCalls[SystemCalls["defaultStackSize"] = -6] = "defaultStackSize";
    // The current SP
    SystemCalls[SystemCalls["stackPointer"] = -8] = "stackPointer";
    SystemCalls[SystemCalls["createMap"] = -15] = "createMap";
    SystemCalls[SystemCalls["setMap"] = -16] = "setMap";
    SystemCalls[SystemCalls["hashString"] = -17] = "hashString";
    SystemCalls[SystemCalls["lookupMap"] = -18] = "lookupMap";
    SystemCalls[SystemCalls["removeMapKey"] = -19] = "removeMapKey";
    SystemCalls[SystemCalls["setNumericMap"] = -20] = "setNumericMap";
    SystemCalls[SystemCalls["lookupNumericMap"] = -21] = "lookupNumericMap";
    SystemCalls[SystemCalls["removeNumericMapKey"] = -22] = "removeNumericMapKey";
    SystemCalls[SystemCalls["abs32"] = -23] = "abs32";
    SystemCalls[SystemCalls["abs64"] = -24] = "abs64";
    SystemCalls[SystemCalls["sqrt32"] = -25] = "sqrt32";
    SystemCalls[SystemCalls["sqrt64"] = -26] = "sqrt64";
    SystemCalls[SystemCalls["trunc32"] = -27] = "trunc32";
    SystemCalls[SystemCalls["trunc64"] = -28] = "trunc64";
    SystemCalls[SystemCalls["nearest32"] = -29] = "nearest32";
    SystemCalls[SystemCalls["nearest64"] = -30] = "nearest64";
    SystemCalls[SystemCalls["ceil32"] = -31] = "ceil32";
    SystemCalls[SystemCalls["ceil64"] = -32] = "ceil64";
    SystemCalls[SystemCalls["floor32"] = -33] = "floor32";
    SystemCalls[SystemCalls["floor64"] = -34] = "floor64";
    SystemCalls[SystemCalls["max32"] = -35] = "max32";
    SystemCalls[SystemCalls["max64"] = -36] = "max64";
    SystemCalls[SystemCalls["min32"] = -37] = "min32";
    SystemCalls[SystemCalls["min64"] = -38] = "min64";
    SystemCalls[SystemCalls["copysign32"] = -39] = "copysign32";
    SystemCalls[SystemCalls["copysign64"] = -49] = "copysign64";
    SystemCalls[SystemCalls["continueCoroutine"] = -52] = "continueCoroutine";
    SystemCalls[SystemCalls["scheduleCoroutine"] = -53] = "scheduleCoroutine";
    SystemCalls[SystemCalls["coroutine"] = -54] = "coroutine";
})(SystemCalls = exports.SystemCalls || (exports.SystemCalls = {}));
let architecture = os.platform() + "-" + os.arch();
class Package {
    constructor(mainPackage = false) {
        // The Fyr directory where to which the package belongs or null for an anonymous package;
        this.fyrPath = null;
        // All source files of the package.
        this.files = [];
        this.tc = new tc.TypeChecker(this);
        if (mainPackage) {
            Package.mainPackage = this;
        }
        Package.packages.push(this);
    }
    sourcePath() {
        return path.join(path.join(this.fyrPath, "src"), this.pkgPath);
    }
    /**
     * Might throw ImportError
     */
    findSources(fyrPath, pkgPath) {
        this.pkgPath = pkgPath;
        this.fyrPath = fyrPath;
        if (this.pkgPath[0] == '/' || this.pkgPath[0] == '\\') {
            throw new ImportError("Import path '" + this.pkgPath + "' must not start with " + path.sep, null, this.pkgPath);
        }
        if (this.fyrPath[this.fyrPath.length - 1] == path.sep) {
            this.fyrPath = this.fyrPath.substr(0, this.fyrPath.length - 1);
        }
        let packagePaths = this.pkgPath.split('/');
        this.objFileName = packagePaths[packagePaths.length - 1];
        packagePaths.splice(packagePaths.length - 1, 1);
        this.objFilePath = path.join(fyrPath, "pkg", architecture, packagePaths.join(path.sep));
        this.binFilePath = path.join(fyrPath, "pkg", architecture);
        this.binFileName = this.objFileName;
        Package.packagesByPath.set(pkgPath, this);
        // Determine all filenames
        let p = this.sourcePath();
        let allFiles = fs.readdirSync(p);
        for (let f of allFiles) {
            if (f.length > 4 && f.substr(f.length - 4, 4) == ".fyr") {
                this.files.push(path.join(p, f));
            }
        }
    }
    setSources(files) {
        this.files = files;
        if (this.files.length == 0) {
            return;
        }
        let paths = this.files[0].split(path.sep);
        let name = paths.splice(paths.length - 1, 1)[0];
        let parsedName = path.parse(name);
        this.objFileName = parsedName.name;
        this.objFilePath = paths.join(path.sep);
        this.binFileName = parsedName.name;
        this.binFilePath = paths.join(path.sep);
    }
    /**
     * Might throw SyntaxError or ImportError or TypeError.
     * The function loads the sources, parses them and applies the first phase of type checking.
     */
    loadSources(theCode) {
        if (this.isInternal) {
            return;
        }
        // Parse all files into a single AST
        this.pkgNode = new ast.Node({ loc: null, op: "module", statements: [] });
        for (let file of this.files) {
            ast.setCurrentFile(file);
            let fileResolved = path.resolve(file);
            let code;
            try {
                code = theCode;
            }
            catch (e) {
                throw new ImportError(("Cannot read file " + file).red, null, this.pkgPath);
            }
            // Remove windows line ending
            code = code.replace(/\r/g, "");
            let f = parser.parse(code);
            this.pkgNode.statements.push(f);
        }
        // This might load more packages
        this.scope = this.tc.checkModule(this);
    }
    /**
     * Might throw TypeError
     */
    checkTypesPassTwo() {
        if (this.isInternal) {
            return;
        }
        this.tc.checkModulePassTwo();
    }
    /**
     * Might throw TypeError
     */
    checkTypesPassThree() {
        if (this.isInternal) {
            return;
        }
        this.tc.checkModulePassThree();
    }
    generateCode(backend, emitIR, initPackages, duplicateCodePackages, disableNullCheck) {
        if (this.isInternal) {
            return;
        }
        console.log("Compiling " + (this.pkgPath ? this.pkgPath : path.join(this.objFilePath, this.objFileName)) + " ...");
        let cBackend;
        let wasmBackend;
        let b;
        if (backend == "C") {
            cBackend = new backend_c_1.CBackend(this);
            b = cBackend;
        }
        else if (backend == "WASM") {
            wasmBackend = new backend_wasm_1.Wasm32Backend();
            b = wasmBackend;
        }
        else {
            b = new backend_dummy_1.DummyBackend();
        }
        this.codegen = new codegen_1.CodeGenerator(this.tc, b, disableNullCheck);
        let ircode = this.codegen.processModule(this.pkgNode, emitIR, initPackages, duplicateCodePackages);
        this.createObjFilePath();
        if (emitIR) {
            let irfile = path.join(this.objFilePath, this.objFileName + ".ir");
            fs.writeFileSync(irfile, ircode, 'utf8');
        }
        if (backend == "WASM") {
            // Generate WAST
            let wastcode = wasmBackend.getCode();
            let wastfile = path.join(this.objFilePath, this.objFileName + ".wat");
            fs.writeFileSync(wastfile, wastcode, 'utf8');
            // Generate WASM
            let wasmfile = path.join(this.objFilePath, this.objFileName + ".wasm");
            child_process.execFileSync("wat2wasm", [wastfile, "-r", "-o", wasmfile]);
        }
        else if (backend == "C") {
            // Generate C code
            let code = cBackend.getImplementationCode();
            let cfile = path.join(this.objFilePath, this.objFileName + ".c");
            fs.writeFileSync(cfile, code, 'utf8');
            let hcode = cBackend.getHeaderCode();
            let hfile = path.join(this.objFilePath, this.objFileName + ".h");
            fs.writeFileSync(hfile, hcode, 'utf8');
            this.hasMain = cBackend.hasMainFunction();
            if (this.isImported && this.hasMain) {
                throw new ImportError("Package " + this.pkgPath + " has been imported as a library, but contains a main function", null, this.pkgPath);
            }
        }
        this.hasInitFunction = (b.getInitFunction() != null);
    }
    generateObjectFiles(backend) {
        // Compile the *.c and *.h files to *.o files
        if (backend == "C") {
            let cfile = path.join(this.objFilePath, this.objFileName + ".c");
            let ofile = path.join(this.objFilePath, this.objFileName + ".o");
            let includes = [];
            // Make fyr.h discoverable
            includes.push("-I" + path.join(Package.fyrBase, "src", "runtime"));
            for (let p of Package.fyrPaths) {
                includes.push("-I" + path.join(p, "pkg", architecture));
            }
            let args = includes.concat(["-O3", "-Wno-parentheses", "-o", ofile, "-c", cfile]);
            console.log("gcc", args.join(" "));
            child_process.execFileSync("gcc", args);
        }
    }
    /**
     * Might throw ImportError
     */
    createObjFilePath() {
        if (this.fyrPath == "" || this.fyrPath == null) {
            return;
        }
        let p = this.fyrPath;
        let packagePaths = this.pkgPath.split('/');
        packagePaths.splice(packagePaths.length - 1, 1);
        let subs = ["pkg", architecture].concat(packagePaths);
        for (let sub of subs) {
            try {
                p = path.join(p, sub);
                fs.mkdirSync(p);
            }
            catch (e) {
                if (e.code !== "EEXIST") {
                    throw new ImportError(("Cannot create directory " + p).red, null, this.pkgPath);
                }
            }
        }
        // Generate the bin directory
        p = this.fyrPath;
        subs = ["bin", architecture];
        for (let sub of subs) {
            try {
                p = path.join(p, sub);
                fs.mkdirSync(p);
            }
            catch (e) {
                if (e.code !== "EEXIST") {
                    throw new ImportError(("Cannot create directory " + p).red, null, this.pkgPath);
                }
            }
        }
    }
    hasTemplateInstantiations() {
        return this.tc.hasTemplateInstantiations();
    }
    /**
     * Checks the types of all packages imported so far.
     * Calling this function multiple times is ok, as it will not check the same package twice,
     * but it will check new imported packages.
     */
    static checkTypesForPackages() {
        let e = null;
        try {
            for (; Package.packagesTypeCheckedPassOne < Package.packages.length; Package.packagesTypeCheckedPassOne++) {
                let p = Package.packages[Package.packagesTypeCheckedPassOne];
                p.checkTypesPassTwo();
            }
            for (; Package.packagesTypeCheckedPassTwo < Package.packages.length; Package.packagesTypeCheckedPassTwo++) {
                let p = Package.packages[Package.packagesTypeCheckedPassTwo];
                p.checkTypesPassThree();
            }
        }
        catch (ex) {
            if (ex instanceof typecheck.TypeError) {
                e = ex;
            }
        }
        return e;
    }
    /**
     * Generates C or WASM files and optionally compiles and links these files to create a native executable.
     */
    static generateCodeForPackages(backend, emitIR, emitNative, disableNullCheck) {
        // Generate code (in the case of "C" this is source code)
        let initPackages = [];
        // Packages that contain (possibly duplicate) code in their header file
        let duplicateCodePackages = [];
        for (let p of Package.packages) {
            if (p == Package.mainPackage || p.isInternal) {
                continue;
            }
            p.generateCode(backend, emitIR, null, null, disableNullCheck);
            if (p.hasInitFunction) {
                initPackages.push(p);
            }
            if (p.tc.hasTemplateInstantiations() || p.codegen.hasDestructors() || p.codegen.hasSymbols()) {
                duplicateCodePackages.push(p);
            }
        }
        if (Package.mainPackage) {
            Package.mainPackage.generateCode(backend, emitIR, initPackages, duplicateCodePackages, disableNullCheck);
        }
        // Create native executable?
        if (emitNative) {
            if (backend !== "C") {
                throw "Implementation error";
            }
            // Generate object files
            for (let p of Package.packages) {
                if (p.isInternal) {
                    continue;
                }
                p.generateObjectFiles(backend);
            }
            // Run the linker
            for (let p of Package.packages) {
                if (!p.isImported && p.hasMain) {
                    if (backend == "C") {
                        // List of all object files
                        let oFiles = [];
                        // Always include fyr.o
                        oFiles.push(path.join(Package.fyrBase, "pkg", architecture, "fyr.o"));
                        for (let importPkg of Package.packages) {
                            if (importPkg.isInternal) {
                                continue;
                            }
                            oFiles.push(path.join(importPkg.objFilePath, importPkg.objFileName + ".o"));
                        }
                        let bFile = path.join(p.binFilePath, p.binFileName);
                        let args = ["-o", bFile].concat(oFiles);
                        console.log("gcc", args.join(" "));
                        child_process.execFileSync("gcc", args);
                    }
                }
            }
        }
    }
    static getFyrPaths() {
        if (Package.fyrPaths) {
            return Package.fyrPaths;
        }
        // Environment variables
        Package.fyrBase = process.env["FYRBASE"];
        if (!Package.fyrBase) {
            console.log(("No FYRBASE environment variable has been set").red);
            return null;
        }
        let fyrPaths_str = process.env["FYRPATH"];
        if (!fyrPaths_str) {
            let home = process.env["HOME"];
            if (!home) {
                fyrPaths_str = "";
            }
            else {
                fyrPaths_str = home + path.sep + "fyr";
            }
        }
        Package.fyrPaths = [Package.fyrBase].concat(fyrPaths_str.split(":"));
        return Package.fyrPaths;
    }
    /**
     * @param pkgPath is of the form "/some/fyr/package".
     * @param loc is the location that is used for reporting an import error.
     *
     * Throws ImportError of the package could not be resolved.
     * Can throw TypeError or SyntaxError if loading of the sources detecs a syntax error.
     */
    static resolve(pkgPath, loc) {
        initPackages();
        if (Package.packagesByPath.has(pkgPath)) {
            return Package.packagesByPath.get(pkgPath);
        }
        for (let p of Package.fyrPaths) {
            let test = path.join(path.join(p, "src"), pkgPath);
            let isdir;
            try {
                isdir = fs.lstatSync(test).isDirectory();
            }
            catch (e) {
                isdir = false;
            }
            if (!isdir) {
                continue;
            }
            let pkg = new Package();
            pkg.isImported = true;
            pkg.findSources(p, pkgPath);
            pkg.loadSources("");
            return pkg;
        }
        throw new ImportError("Unknown package \"" + pkgPath + "\"", loc, pkgPath);
    }
    // Used for system defined packages
    static registerPackage(p) {
        Package.packagesByPath.set(p.pkgPath, p);
    }
    static initiliazeVariables() {
        Package.mainPackage = null;
        Package.packagesByPath = new Map();
        Package.packages = [];
        Package.packagesTypeCheckedPassOne = 0;
        Package.packagesTypeCheckedPassTwo = 0;
    }
}
/**
 * The number of packages inside the Package.packages array that have already been type-checked.
 */
Package.packagesTypeCheckedPassOne = 0;
Package.packagesTypeCheckedPassTwo = 0;
Package.packagesByPath = new Map();
Package.packages = [];
exports.Package = Package;
class ImportError {
    constructor(message, loc, path) {
        this.message = message;
        this.location = loc;
        this.path = path;
    }
}
exports.ImportError = ImportError;
function makeMathFunction64(name, paramCount, call, tc) {
    var f = new typecheck_1.Function();
    f.name = name;
    let t = new typecheck_1.FunctionType();
    t.callingConvention = "system";
    t.name = name;
    t.returnType = typecheck_1.TypeChecker.t_double;
    t.systemCallType = call;
    for (let i = 0; i < paramCount; i++) {
        let p = new typecheck_1.FunctionParameter();
        p.name = "value" + i.toString();
        p.type = typecheck_1.TypeChecker.t_double;
        t.parameters.push(p);
    }
    f.type = t;
    return f;
}
function makeMathFunction32(name, paramCount, call, tc) {
    var f = new typecheck_1.Function();
    f.name = name;
    let t = new typecheck_1.FunctionType();
    t.callingConvention = "system";
    t.name = name;
    t.returnType = typecheck_1.TypeChecker.t_float;
    t.systemCallType = call;
    for (let i = 0; i < paramCount; i++) {
        let p = new typecheck_1.FunctionParameter();
        p.name = "value" + i.toString();
        p.type = typecheck_1.TypeChecker.t_float;
        t.parameters.push(p);
    }
    f.type = t;
    return f;
}
let initialized = false;
function initPackages() {
    if (initialized) {
        return;
    }
    initialized = true;
    let systemPkg = new Package();
    systemPkg.scope = new typecheck_1.Scope(null);
    systemPkg.isInternal = true;
    systemPkg.pkgPath = "fyr/system";
    systemPkg.fyrPath = Package.fyrBase;
    var heap = new typecheck_1.Function();
    heap.name = "heap";
    heap.type = new typecheck_1.FunctionType();
    heap.type.callingConvention = "system";
    heap.type.name = "heap";
    heap.type.systemCallType = SystemCalls.heap;
    heap.type.returnType = new typecheck_1.UnsafePointerType(typecheck_1.TypeChecker.t_void);
    systemPkg.scope.registerElement(heap.name, heap);
    var currentMemory = new typecheck_1.Function();
    currentMemory.name = "currentMemory";
    currentMemory.type = new typecheck_1.FunctionType();
    currentMemory.type.name = "currentMemory";
    currentMemory.type.systemCallType = SystemCalls.currentMemory;
    currentMemory.type.returnType = typecheck_1.TypeChecker.t_uint;
    currentMemory.type.callingConvention = "system";
    systemPkg.scope.registerElement(currentMemory.name, currentMemory);
    var growMemory = new typecheck_1.Function();
    growMemory.name = "growMemory";
    growMemory.type = new typecheck_1.FunctionType();
    growMemory.type.name = "growMemory";
    growMemory.type.systemCallType = SystemCalls.growMemory;
    growMemory.type.returnType = typecheck_1.TypeChecker.t_int;
    let p = new typecheck_1.FunctionParameter();
    p.name = "pages";
    p.type = typecheck_1.TypeChecker.t_uint;
    growMemory.type.parameters.push(p);
    growMemory.type.callingConvention = "system";
    systemPkg.scope.registerElement(growMemory.name, growMemory);
    var heapTypemap = new typecheck_1.Function();
    heapTypemap.name = "heapTypemap";
    heapTypemap.type = new typecheck_1.FunctionType();
    heapTypemap.type.callingConvention = "system";
    heapTypemap.type.name = "heapTypemap";
    heapTypemap.type.systemCallType = SystemCalls.heapTypemap;
    heapTypemap.type.returnType = new typecheck_1.UnsafePointerType(typecheck_1.TypeChecker.t_void);
    systemPkg.scope.registerElement(heapTypemap.name, heapTypemap);
    var pageSize = new typecheck_1.Function();
    pageSize.name = "pageSize";
    pageSize.type = new typecheck_1.FunctionType();
    pageSize.type.callingConvention = "system";
    pageSize.type.name = "pageSize";
    pageSize.type.systemCallType = SystemCalls.pageSize;
    pageSize.type.returnType = typecheck_1.TypeChecker.t_uint;
    systemPkg.scope.registerElement(pageSize.name, pageSize);
    var defaultStackSize = new typecheck_1.Function();
    defaultStackSize.name = "defaultStackSize";
    defaultStackSize.type = new typecheck_1.FunctionType();
    defaultStackSize.type.callingConvention = "system";
    defaultStackSize.type.name = "defaultStackSize";
    defaultStackSize.type.systemCallType = SystemCalls.defaultStackSize;
    defaultStackSize.type.returnType = typecheck_1.TypeChecker.t_uint;
    systemPkg.scope.registerElement(defaultStackSize.name, defaultStackSize);
    var stackPointer = new typecheck_1.Function();
    stackPointer.name = "stackPointer";
    stackPointer.type = new typecheck_1.FunctionType();
    stackPointer.type.callingConvention = "system";
    stackPointer.type.name = "stackPointer";
    stackPointer.type.systemCallType = SystemCalls.stackPointer;
    stackPointer.type.returnType = new typecheck_1.UnsafePointerType(typecheck_1.TypeChecker.t_void);
    systemPkg.scope.registerElement(stackPointer.name, stackPointer);
    var continueCoroutine = new typecheck_1.Function();
    continueCoroutine.name = "continueCoroutine";
    continueCoroutine.type = new typecheck_1.FunctionType();
    continueCoroutine.type.callingConvention = "system";
    continueCoroutine.type.name = "continueCoroutine";
    continueCoroutine.type.systemCallType = SystemCalls.continueCoroutine;
    continueCoroutine.type.returnType = typecheck_1.TypeChecker.t_uint32;
    p = new typecheck_1.FunctionParameter();
    p.name = "step";
    p.type = typecheck_1.TypeChecker.t_uint32;
    continueCoroutine.type.parameters.push(p);
    p = new typecheck_1.FunctionParameter();
    p.name = "frame";
    p.type = new typecheck_1.UnsafePointerType(typecheck_1.TypeChecker.t_void);
    continueCoroutine.type.parameters.push(p);
    p = new typecheck_1.FunctionParameter();
    p.name = "step";
    p.type = typecheck_1.TypeChecker.t_uint32;
    continueCoroutine.type.parameters.push(p);
    systemPkg.scope.registerElement(continueCoroutine.name, continueCoroutine);
    var scheduleCoroutine = new typecheck_1.Function();
    scheduleCoroutine.name = "scheduleCoroutine";
    scheduleCoroutine.type = new typecheck_1.FunctionType();
    scheduleCoroutine.type.callingConvention = "system";
    scheduleCoroutine.type.name = "scheduleCoroutine";
    scheduleCoroutine.type.systemCallType = SystemCalls.scheduleCoroutine;
    scheduleCoroutine.type.returnType = typecheck_1.TypeChecker.t_void;
    p = new typecheck_1.FunctionParameter();
    p.name = "c";
    p.type = new typecheck_1.UnsafePointerType(typecheck_1.TypeChecker.t_void);
    scheduleCoroutine.type.parameters.push(p);
    systemPkg.scope.registerElement(scheduleCoroutine.name, scheduleCoroutine);
    var coroutine = new typecheck_1.Function();
    coroutine.name = "coroutine";
    coroutine.type = new typecheck_1.FunctionType();
    coroutine.type.callingConvention = "system";
    coroutine.type.name = "coroutine";
    coroutine.type.systemCallType = SystemCalls.coroutine;
    coroutine.type.returnType = new typecheck_1.UnsafePointerType(typecheck_1.TypeChecker.t_void);
    systemPkg.scope.registerElement(coroutine.name, coroutine);
    Package.registerPackage(systemPkg);
    let mathPkg = new Package();
    mathPkg.scope = new typecheck_1.Scope(null);
    mathPkg.isInternal = true;
    mathPkg.pkgPath = "math";
    mathPkg.fyrPath = Package.fyrBase;
    let abs = makeMathFunction64("abs", 1, SystemCalls.abs64, mathPkg.tc);
    mathPkg.scope.registerElement(abs.name, abs);
    let sqrt = makeMathFunction64("sqrt", 1, SystemCalls.sqrt64, mathPkg.tc);
    mathPkg.scope.registerElement(sqrt.name, sqrt);
    let trunc = makeMathFunction64("trunc", 1, SystemCalls.trunc64, mathPkg.tc);
    mathPkg.scope.registerElement(trunc.name, trunc);
    let nearest = makeMathFunction64("nearest", 1, SystemCalls.nearest64, mathPkg.tc);
    mathPkg.scope.registerElement(nearest.name, nearest);
    let ceil = makeMathFunction64("ceil", 1, SystemCalls.sqrt64, mathPkg.tc);
    mathPkg.scope.registerElement(ceil.name, ceil);
    let floor = makeMathFunction64("floor", 1, SystemCalls.floor64, mathPkg.tc);
    mathPkg.scope.registerElement(floor.name, floor);
    let copysign = makeMathFunction64("copysign", 2, SystemCalls.copysign64, mathPkg.tc);
    mathPkg.scope.registerElement(copysign.name, copysign);
    Package.registerPackage(mathPkg);
    let math32Pkg = new Package();
    math32Pkg.scope = new typecheck_1.Scope(null);
    math32Pkg.isInternal = true;
    math32Pkg.pkgPath = "math/math32";
    math32Pkg.fyrPath = Package.fyrBase;
    let abs32 = makeMathFunction32("abs", 1, SystemCalls.abs32, math32Pkg.tc);
    math32Pkg.scope.registerElement(abs.name, abs32);
    let sqrt32 = makeMathFunction32("sqrt", 1, SystemCalls.sqrt32, math32Pkg.tc);
    math32Pkg.scope.registerElement(sqrt.name, sqrt32);
    let trunc32 = makeMathFunction32("trunc", 1, SystemCalls.trunc32, math32Pkg.tc);
    math32Pkg.scope.registerElement(trunc.name, trunc32);
    let nearest32 = makeMathFunction32("nearest", 1, SystemCalls.nearest32, math32Pkg.tc);
    math32Pkg.scope.registerElement(nearest.name, nearest32);
    let ceil32 = makeMathFunction32("ceil", 1, SystemCalls.sqrt32, math32Pkg.tc);
    math32Pkg.scope.registerElement(ceil.name, ceil32);
    let floor32 = makeMathFunction32("floor", 1, SystemCalls.floor32, math32Pkg.tc);
    math32Pkg.scope.registerElement(floor.name, floor32);
    let copysign32 = makeMathFunction32("copysign", 2, SystemCalls.copysign32, math32Pkg.tc);
    math32Pkg.scope.registerElement(copysign.name, copysign32);
    Package.registerPackage(math32Pkg);
}
//# sourceMappingURL=pkg.js.map