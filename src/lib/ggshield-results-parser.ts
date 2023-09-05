import { Diagnostic, Range, Position, DiagnosticSeverity } from "vscode";
import {
  GGShieldScanResults,
  EntityWithIncidents,
  Incident,
  Occurence,
} from "./api-types";

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
            `ggshield: ${incident.type} - ${occurrence.type}`,
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
