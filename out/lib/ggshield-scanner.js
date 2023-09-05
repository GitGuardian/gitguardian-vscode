"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ggshieldScanFile = void 0;
const child_process_1 = require("child_process");
const vscode_1 = require("vscode");
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
    if (vscode_1.workspace.workspaceFolders?.length || 0 > 0) {
        options["cwd"] = vscode_1.workspace.workspaceFolders[0].uri.fsPath;
    }
    let proc = (0, child_process_1.spawnSync)(ggshieldPath, ["secret", "scan", "--json", "path", filePath], options);
    let hasFailed = false;
    proc.stderr.split("\n").forEach((stderrLine) => {
        if (stderrLine.length > 0 &&
            !stderrLine.includes("Scanning Path...") // ggshield outputs this info message on stderr, ignore it
        ) {
            vscode_1.window.showErrorMessage(`ggshield: ${stderrLine}`);
            hasFailed = true;
        }
    });
    if (hasFailed) {
        return undefined;
    }
    return JSON.parse(proc.stdout);
}
exports.ggshieldScanFile = ggshieldScanFile;
//# sourceMappingURL=ggshield-scanner.js.map