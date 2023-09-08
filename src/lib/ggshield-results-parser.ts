import {
  Diagnostic,
  Range,
  Position,
  DiagnosticSeverity,
  window,
} from "vscode";
import {
  GGShieldScanResults,
  EntityWithIncidents,
  Incident,
  Occurence,
  Validity,
} from "./api-types";

const validityDisplayName: Record<Validity, string> = {
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

  try {
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
Total occurences: ${incident.total_occurrences}
Incident URL: ${incident.incident_url || "N/A"}
Secret SHA: ${incident.ignore_sha}`,
              DiagnosticSeverity.Warning
            );
            diagnostics.push(diagnostic);
          });
        });
      }
    );
  } catch (e) {
    console.error(e);
    window.showErrorMessage("ggshield: Error parsing scan results");
  }

  return diagnostics;
}
