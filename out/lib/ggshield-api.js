"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ggshieldScanFile = exports.ignoreLastFound = exports.showAPIQuota = exports.runGGShieldCommand = void 0;
const child_process_1 = require("child_process");
const vscode_1 = require("vscode");
const ggshield_configuration_1 = require("./ggshield-configuration");
/**
 * Run ggshield CLI application with specified arguments
 *
 * @param configuration ggshield configuration
 * @param args arguments
 * @returns
 */
function runGGShieldCommand(configuration, args) {
    const { ggshieldPath, apiKey, apiUrl } = configuration;
    let options = {
        cwd: "/tmp",
        env: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            GITGUARDIAN_API_KEY: apiKey,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            GITGUARDIAN_API_URL: apiUrl,
        },
        encoding: "utf-8",
        windowsHide: true,
    };
    // If the command is executed in a worskpace, execute ggshield from the root folder so .gitguardian.yaml is used
    if (vscode_1.workspace.workspaceFolders?.length || 0 > 0) {
        options["cwd"] = vscode_1.workspace.workspaceFolders[0].uri.fsPath;
    }
    let proc = (0, child_process_1.spawnSync)(ggshieldPath, args, options);
    return proc;
}
exports.runGGShieldCommand = runGGShieldCommand;
/**
 * Display API quota
 *
 * Show error message on failure
 */
function showAPIQuota() {
    const configuration = (0, ggshield_configuration_1.getGGShieldConfiguration)();
    if (!configuration) {
        vscode_1.window.showErrorMessage("ggshield: Missing settings");
        return;
    }
    const proc = runGGShieldCommand(configuration, ["quota"]);
    if (proc.stderr.length > 0) {
        vscode_1.window.showErrorMessage(`ggshield: ${proc.stderr}`);
    }
    if (proc.stdout.length > 0) {
        vscode_1.window.showInformationMessage(`ggshield: ${proc.stdout}`);
    }
}
exports.showAPIQuota = showAPIQuota;
/**
 * Ignore last found secrets
 *
 * Show error message on failure
 */
function ignoreLastFound() {
    const configuration = (0, ggshield_configuration_1.getGGShieldConfiguration)();
    if (!configuration) {
        vscode_1.window.showErrorMessage("ggshield: Missing settings");
        return;
    }
    const proc = runGGShieldCommand(configuration, [
        "secret",
        "ignore",
        "--last-found",
    ]);
    if (proc.stderr.length > 0) {
        vscode_1.window.showErrorMessage(`ggshield: ${proc.stderr}`);
    }
    if (proc.stdout.length > 0) {
        vscode_1.window.showInformationMessage(`ggshield: ${proc.stdout}`);
    }
}
exports.ignoreLastFound = ignoreLastFound;
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
    const proc = runGGShieldCommand(configuration, [
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
//# sourceMappingURL=ggshield-api.js.map