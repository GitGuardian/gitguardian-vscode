import * as assert from "assert";

import { parseGGShieldResults } from "../../lib/ggshield-results-parser";
import { DiagnosticSeverity } from "vscode";
import {
  scanResultsNoIncident,
  scanResultsVaulted,
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
    assert.ok(diagnostic.message.includes("Secret found in vault: NO"));
    assert.strictEqual(diagnostic.range.start.line, 3);
    assert.strictEqual(diagnostic.range.start.character, 11);
    assert.strictEqual(diagnostic.range.end.line, 3);
    assert.strictEqual(diagnostic.range.end.character, 79);
    assert.strictEqual(diagnostic.severity, DiagnosticSeverity.Warning);
  });

  test("Should parse vault information", () => {
    const diagnostics = parseGGShieldResults(JSON.parse(scanResultsVaulted));
    const diagnostic = diagnostics[0];
    assert.ok(diagnostic.message.includes("Secret found in vault: YES"));
    assert.ok(
      diagnostic.message.includes("├─ Vault Type: AWS Secrets Manager"),
    );
    assert.ok(
      diagnostic.message.includes("├─ Vault Name: 463175827647/us-west-2"),
    );
    assert.ok(
      diagnostic.message.includes(
        "└─ Secret Path: arn:aws:secretsmanager:us-west-2:463175827647:secret:xav-test-svef2q:pwd",
      ),
    );
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
