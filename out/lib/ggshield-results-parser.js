"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGGShieldResults = void 0;
const vscode_1 = require("vscode");
const validityDisplayName = {
    unknown: "Unknown",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    cannot_check: "Cannot Check",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    no_checker: "No Checker",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    failed_to_check: "Failed to Check",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    not_checked: "Not Checked",
    invalid: "Invalid",
    valid: "Valid",
};
/**
 * Parse ggshield results and return diagnostics of found incidents
 *
 * @param results ggshield scan results
 * @returns incidents diagnostics
 */
function parseGGShieldResults(results) {
    let diagnostics = [];
    try {
        results.entities_with_incidents.forEach((entityWithIncidents) => {
            entityWithIncidents.incidents.forEach((incident) => {
                incident.occurrences.forEach((occurrence) => {
                    let range = new vscode_1.Range(new vscode_1.Position(occurrence.line_start - 1, occurrence.index_start), new vscode_1.Position(occurrence.line_end - 1, occurrence.index_end));
                    let diagnostic = new vscode_1.Diagnostic(range, `ggshield: ${occurrence.type}

Secret detected: ${incident.type}
Validity: ${validityDisplayName[incident.validity]}
Known by GitGuardian dashboard: ${incident.known_secret ? "YES" : "NO"}
Total occurences: ${incident.total_occurrences}
Incident URL: ${incident.incident_url || "N/A"}
Secret SHA: ${incident.ignore_sha}`, vscode_1.DiagnosticSeverity.Warning);
                    diagnostics.push(diagnostic);
                });
            });
        });
    }
    catch (e) {
        console.error(e);
        vscode_1.window.showErrorMessage("ggshield: Error parsing scan results");
    }
    return diagnostics;
}
exports.parseGGShieldResults = parseGGShieldResults;
//# sourceMappingURL=ggshield-results-parser.js.map