"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showGGShieldQuota = void 0;
const vscode_1 = require("vscode");
const ggshield_api_1 = require("./ggshield-api");
const ggshield_configuration_1 = require("./ggshield-configuration");
/**
 * Display GGShield quota
 *
 * Show error message on failure
 */
function showGGShieldQuota() {
    const configuration = (0, ggshield_configuration_1.getGGShieldConfiguration)();
    if (!configuration) {
        vscode_1.window.showErrorMessage("ggshield: Missing settings");
        return;
    }
    const proc = (0, ggshield_api_1.runGGShieldCommand)(configuration, ["quota"]);
    if (proc.stderr.length > 0) {
        vscode_1.window.showErrorMessage(`ggshield: ${proc.stderr}`);
    }
    if (proc.stdout.length > 0) {
        vscode_1.window.showInformationMessage(`ggshield: ${proc.stdout}`);
    }
}
exports.showGGShieldQuota = showGGShieldQuota;
//# sourceMappingURL=ggshield-quota.js.map