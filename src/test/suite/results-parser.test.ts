import * as assert from "assert";

import { parseGGShieldResults } from "../../lib/ggshield-results-parser";
import { DiagnosticSeverity } from "vscode";
import {
  scanResultsNoIncident,
  scanResultsWithIncident,
  scanResultsWithUriIncident,
} from "../constants";

suite("parseGGShieldResults", () => {
  test("Should parse ggshield scan output", () => {
    const diagnostics = parseGGShieldResults(
      JSON.parse(scanResultsWithIncident),
    );
    assert.strictEqual(diagnostics.length, 1);
    const diagnostic = diagnostics[0];
    assert.ok(diagnostic.message.includes("apikey"));
    assert.ok(diagnostic.message.includes("Generic High Entropy Secret"));
    assert.ok(diagnostic.message.includes("Secret in Secrets Manager: NO"));
    assert.strictEqual(diagnostic.range.start.line, 3);
    assert.strictEqual(diagnostic.range.start.character, 11);
    assert.strictEqual(diagnostic.range.end.line, 3);
    assert.strictEqual(diagnostic.range.end.character, 79);
    assert.strictEqual(diagnostic.severity, DiagnosticSeverity.Warning);
  });

  test("Should return an empty array if there are no incidents", () => {
    const diagnostics = parseGGShieldResults(JSON.parse(scanResultsNoIncident));
    assert.strictEqual(diagnostics.length, 0);
  });

  test("Should return an empty array on an invalid ggshield output", () => {
    const diagnostics = parseGGShieldResults(JSON.parse("{}"));
    assert.strictEqual(diagnostics.length, 0);
  });

  test("Should only return the 'connection_uri' match if the secret is an URI", () => {
    const diagnostics = parseGGShieldResults(
      JSON.parse(scanResultsWithUriIncident),
    );
    assert.strictEqual(diagnostics.length, 1);
    assert.ok(diagnostics[0].message.includes("connection_uri"));
  });
});
