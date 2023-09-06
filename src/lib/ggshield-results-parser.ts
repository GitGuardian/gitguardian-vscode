import { Diagnostic, Range, Position, DiagnosticSeverity } from "vscode";
import {
  GGShieldScanResults,
  EntityWithIncidents,
  Incident,
  Occurence,
} from "./api-types";

const validityDisplayName: Record<string, string> = {
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
export function parseGGShieldResults(
  results: GGShieldScanResults
): Diagnostic[] {
  let diagnostics: Diagnostic[] = [];
  results.entities_with_incidents.forEach(
    (entityWithIncidents: EntityWithIncidents) => {
      entityWithIncidents.incidents.forEach((incident: Incident) => {
        incident.occurrences.forEach((occurrence: Occurence) => {
          let range = new Range(
            new Position(occurrence.line_start - 1, occurrence.index_start),
            new Position(occurrence.line_end - 1, occurrence.index_end)
          );
          let diagnostic = new Diagnostic(
            range,
            `ggshield: ${occurrence.type}

Secret detected: ${incident.type}
Validity: ${validityDisplayName[incident.validity]}
Known by GitGuardian dashboard: ${incident.known_secret ? "YES" : "NO"}
Incident URL: ${incident.incident_url || "N/A"}
Secret SHA: ${incident.ignore_sha}

For more info on how to remediate this incident: https://docs.gitguardian.com/internal-repositories-monitoring/remediate/remediate-incidents
    `,
            DiagnosticSeverity.Warning
          );
          diagnostics.push(diagnostic);
        });
      });
    }
  );

  return diagnostics;
}

/**
 * Remove duplicated incidents diagnostics
 *
 * @param diagnostics diagnostics of found incidents
 */
export function removeDuplicatedIncidentsDiagnostics(
  diagnostics: Diagnostic[]
) {
  let uniqueDiagnostics: Diagnostic[] = [];
  let seen: Set<string> = new Set();
  diagnostics.forEach((diagnostic: Diagnostic) => {
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
