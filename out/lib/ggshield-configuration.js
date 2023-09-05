"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGGShieldConfiguration = void 0;
const vscode_1 = require("vscode");
/**
 * Retrieve configuration from settings
 *
 * @returns ggshield configuration or undefined if at least one setting is empty
 */
function getGGShieldConfiguration() {
    let config = vscode_1.workspace.getConfiguration("ggshield");
    let ggshieldPath = config.get("ggshieldPath");
    let apiUrl = config.get("apiUrl");
    let apiKey = config.get("apiKey");
    if (!ggshieldPath || !apiKey || !apiUrl) {
        // all settings are mandatory for the extension to work
        return undefined;
    }
    return {
        ggshieldPath,
        apiKey,
        apiUrl,
    };
}
exports.getGGShieldConfiguration = getGGShieldConfiguration;
//# sourceMappingURL=ggshield-configuration.js.map