"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const ggshield_configuration_1 = require("./lib/ggshield-configuration");
const ggshield_scanner_1 = require("./lib/ggshield-scanner");
const ggshield_results_parser_1 = require("./lib/ggshield-results-parser");
const vscode_1 = require("vscode");
/**
 * Extension diagnostic collection
 */
let diagnosticCollection;
/**
 * Scan a file using ggshield
 *
 * - retrieve configuration
 * - scan file using ggshield CLI application
 * - parse ggshield results
 * - remove duplicated incidents diagnostics
 * - set diagnostics collection so the incdients are visible to the user
 *
 * @param filePath path to file
 * @param fileUri file uri
 */
function scanFile(filePath, fileUri) {
    const configuration = (0, ggshield_configuration_1.getGGShieldConfiguration)();
    if (!configuration) {
        vscode_1.window.showErrorMessage("ggshield: Missing settings");
        return;
    }
    const results = (0, ggshield_scanner_1.ggshieldScanFile)(filePath, configuration);
    if (!results) {
        return;
    }
    let incidentsDiagnostics = (0, ggshield_results_parser_1.parseGGShieldResults)(results);
    let uniqueDiagnostics = (0, ggshield_results_parser_1.removeDuplicatedIncidentsDiagnostics)(incidentsDiagnostics);
    diagnosticCollection.set(fileUri, uniqueDiagnostics);
}
/**
 * Clean up file diagnostics
 *
 * @param fileUri file uri
 */
function cleanUpFileDiagnostics(fileUri) {
    diagnosticCollection.delete(fileUri);
}
function activate(context) {
    diagnosticCollection = vscode_1.languages.createDiagnosticCollection("ggshield");
    context.subscriptions.push(diagnosticCollection);
    context.subscriptions.push(vscode_1.workspace.onDidSaveTextDocument((textDocument) => {
        scanFile(textDocument.fileName, textDocument.uri);
    }), vscode_1.workspace.onDidOpenTextDocument((textDocument) => {
        scanFile(textDocument.fileName, textDocument.uri);
    }), vscode_1.workspace.onDidCloseTextDocument((textDocument) => cleanUpFileDiagnostics(textDocument.uri)));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map