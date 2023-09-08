"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ggshieldScanFile = void 0;
const vscode_1 = require("vscode");
const ggshield_api_1 = require("./ggshield-api");
/**
 * Scan a file using ggshield CLI application
 *
 * Show error messages on failure
 *
 * @param filePath path to file
 * @param configuration ggshield configuration
 * @returns results or undefined if there was an error
 */
function ggshieldScanFile(filePath, configuration) {
    const proc = (0, ggshield_api_1.runGGShieldCommand)(configuration, [
        "secret",
        "scan",
        "--json",
        "path",
        filePath,
    ]);
    // Ignore errors concerning usage
    // This occurs when the path of the file is invalid (i.e.VSCode sending an event for files not on the file system)
    if (proc.stderr.includes("Usage: ggshield secret scan path")) {
        return undefined;
    }
    let errorMessage = "";
    proc.stderr.split("\n").forEach((stderrLine) => {
        if (stderrLine.length > 0 &&
            !stderrLine.includes("Scanning Path...") // ggshield outputs this info message on stderr, ignore it
        ) {
            errorMessage += stderrLine + "\n";
        }
    });
    if (errorMessage.length > 0) {
        vscode_1.window.showErrorMessage(`ggshield: ${errorMessage}`);
        return undefined;
    }
    return JSON.parse(proc.stdout);
}
exports.ggshieldScanFile = ggshieldScanFile;
//# sourceMappingURL=ggshield-scanner.js.map