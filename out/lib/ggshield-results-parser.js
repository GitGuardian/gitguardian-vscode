"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeDuplicatedIncidentsDiagnostics = exports.parseGGShieldResults = void 0;
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
    results.entities_with_incidents.forEach((entityWithIncidents) => {
        entityWithIncidents.incidents.forEach((incident) => {
            incident.occurrences.forEach((occurrence) => {
                let range = new vscode_1.Range(new vscode_1.Position(occurrence.line_start - 1, occurrence.index_start), new vscode_1.Position(occurrence.line_end - 1, occurrence.index_end));
                let diagnostic = new vscode_1.Diagnostic(range, `ggshield: ${occurrence.type}

Secret detected: ${incident.type}
Validity: ${validityDisplayName[incident.validity]}
Known by GitGuardian dashboard: ${incident.known_secret ? "YES" : "NO"}
Incident URL: ${incident.incident_url || "N/A"}
Secret SHA: ${incident.ignore_sha}

For more info on how to remediate this incident: https://docs.gitguardian.com/internal-repositories-monitoring/remediate/remediate-incidents
    `, vscode_1.DiagnosticSeverity.Warning);
                diagnostics.push(diagnostic);
            });
        });
    });
    return diagnostics;
}
exports.parseGGShieldResults = parseGGShieldResults;
/**
 * Remove duplicated incidents diagnostics
 *
 * @param diagnostics diagnostics of found incidents
 */
function removeDuplicatedIncidentsDiagnostics(diagnostics) {
    let uniqueDiagnostics = [];
    let seen = new Set();
    diagnostics.forEach((diagnostic) => {
        let key = diagnostic.message + ".";
        key += diagnostic.range.start.line + "-";
        key += diagnostic.range.start.character + "#";
        key += diagnostic.range.end.line + "-";
        key += diagnostic.range.end.character;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueDiagnostics.push(diagnostic);
        }
    });
    return uniqueDiagnostics;
}
exports.removeDuplicatedIncidentsDiagnostics = removeDuplicatedIncidentsDiagnostics;
//# sourceMappingURL=ggshield-results-parser.js.map