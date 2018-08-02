/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	createConnection, TextDocuments, TextDocument, Diagnostic, DiagnosticSeverity,
	ProposedFeatures, InitializeParams, DidChangeConfigurationNotification, Position
}from 'vscode-languageserver';

import fs = require('fs');
import path = require('path');
import { Package, ImportError } from "./compiler/pkg";

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = capabilities.workspace && !!capabilities.workspace.configuration;
	hasWorkspaceFolderCapability = capabilities.workspace && !!capabilities.workspace.workspaceFolders;
	hasDiagnosticRelatedInformationCapability = capabilities.textDocument && capabilities.textDocument.publishDiagnostics && capabilities.textDocument.publishDiagnostics.relatedInformation;

	return {
		capabilities: {
			textDocumentSync: documents.syncKind
		}
	}
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders((_event) => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(change.settings.languageServerExample || defaultSettings);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({ scopeUri: resource, section: 'languageServerExample' });
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri);
	let edited = textDocument.uri
	edited=edited.replace("file:///c%3A","C:")
	edited = edited.replace("file:///d%3A", "D:")
	edited = edited.replace("file:///e%3A", "E:")
	edited = edited.replace("file:///f%3A", "E:")
	while(edited.includes("/"))
	{edited=edited.replace("/","\\");}
	console.log(edited)
	let text = textDocument.getText();
	var syntaxError=false;
	var typeError=false;
	var exceptionThrown=null;
	var start:Position=null
	var end: Position=null
	var typeOfError:string
	
	var args: Array<object | string> = Array.prototype.slice.call(arguments, 0);
	args[0] =edited
	console.log(args[0])
	args = args.splice(args.length - 2, 1);
	let fyrPaths = Package.getFyrPaths();
	let pkg: Package;
	Package.initiliazeVariables();

	// Compile a package?
	if (args.length == 1) {
		let p = path.resolve(args[0] as string);
		if (p[p.length - 1] != path.sep) {
			p += path.sep;
		}
		let isdir: boolean;
		try {
			isdir = fs.lstatSync(p).isDirectory();
		} catch (e) {
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
					let packagePaths: Array<string> = pkgPath.split(path.sep);
					packagePaths.splice(packagePaths.length - 1, 1);
					pkg = new Package(true);
					pkg.findSources(fyrPath, pkgPath);
					break;
				}
			}
			// Not a package in one of the Fyr paths?
			if (!pkg) {
				// Determine all filenames
				let files: Array<string> = [];
				let allFiles = fs.readdirSync(p);
				for (let f of allFiles) {
					if (f.length > 4 && f.substr(f.length - 4, 4) == ".fyr") {
						files.push(path.join(p, f));
					}
				}
				pkg = new Package(true);
				pkg.setSources(files);
			}
		}
	}

	// Compile a list of files?
	if (!pkg) {
		let files: Array<string> = [];
		// Determine all source files to compile
		for (let i = 0; i < args.length; i++) {
			let file = args[i];
			files.push(file as string);
		}
		pkg = new Package(true);
		pkg.setSources(files);
	}

	// Load all sources
	try {
		text = text.replace(/\r/g, "");
		pkg.loadSources(text);
	} catch (e) {
		exceptionThrown = e;
		syntaxError = true;
		//console.log("Caught: " + exceptionThrown.message)
	}
	
	// TypeCheck the sources	
	if(Package.checkTypesForPackages()!=null && !syntaxError)
		{
			typeError = true;
			exceptionThrown = Package.checkTypesForPackages();
			//console.log("Caught: "+exceptionThrown.message)
		}	
	let diagnostics: Diagnostic[] = [];
	while ((syntaxError || typeError)) {
		if(syntaxError){typeOfError="Syntax Error"}
		if (typeError) { typeOfError = "Type Error" }
		syntaxError=false;
		typeError = false;
		start=textDocument.positionAt(exceptionThrown.location.start.offset)
		end = textDocument.positionAt(exceptionThrown.location.end.offset)
		start.line = exceptionThrown.location.start.line-1
		start.character = exceptionThrown.location.start.column-1
		end.line = exceptionThrown.location.end.line-1
		end.character = exceptionThrown.location.end.column-1
		let diagnosic: Diagnostic = {
			severity: DiagnosticSeverity.Error,
			range: {
				start: start,
				end: textDocument.positionAt(text.length)
			},
			message: "Error: "+exceptionThrown.message,
			source: 'Fyr Linter'
		};
		if (hasDiagnosticRelatedInformationCapability) {
			diagnosic.relatedInformation = [
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnosic.range)
					},
					message: typeOfError
				},	
			];
		}
		diagnostics.push(diagnosic);
	}

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles((_change) => {
	// Monitored files have change in VSCode
	connection.console.log('We received a file change event');
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();