import * as assert from "assert";

import { parseGGShieldResults } from "../../lib/ggshield-results-parser";
import { window, DiagnosticSeverity } from "vscode";

const results = `{
"id":"/Users/paulindenaurois/Development/gitguardian/ggshield-vscode-extension/sample_files/test.py",
"type":"path_scan",
"entities_with_incidents":[
   {
      "mode":"FILE",
      "filename":"/Users/paulindenaurois/Development/gitguardian/ggshield-vscode-extension/sample_files/test.py",
      "incidents":[
         {
            "policy":"Secrets detection",
            "occurrences":[
               {
                  "match":"DDACC73DdB04********************************************057c78317C39",
                  "type":"apikey",
                  "line_start":4,
                  "line_end":4,
                  "index_start":11,
                  "index_end":79,
                  "pre_line_start":4,
                  "pre_line_end":4
               }
            ],
            "type":"Generic High Entropy Secret",
            "validity":"no_checker",
            "ignore_sha":"38353eb1a2aac5b24f39ed67912234d4b4a2e23976d504a88b28137ed2b9185e",
            "total_occurrences":1,
            "incident_url":"",
            "known_secret":false
         }
      ],
      "total_incidents":1,
      "total_occurrences":1
   }
],
"total_incidents":1,
"total_occurrences":1,
"secrets_engine_version":"2.96.0"
}`;

suite("parseGGShieldResults", () => {
  test("Should parse ggshield scan output", () => {
    const diagnostics = parseGGShieldResults(JSON.parse(results));
    assert.strictEqual(diagnostics.length, 1);
    const diagnostic = diagnostics[0];
    assert.ok(diagnostic.message.includes("apikey"));
    assert.ok(diagnostic.message.includes("Generic High Entropy Secret"));
    assert.strictEqual(diagnostic.range.start.line, 3);
    assert.strictEqual(diagnostic.range.start.character, 11);
    assert.strictEqual(diagnostic.range.end.line, 3);
    assert.strictEqual(diagnostic.range.end.character, 79);
    assert.strictEqual(diagnostic.severity, DiagnosticSeverity.Warning);
  });

  test("Should return an empty array on an invalid ggshield output", () => {
    const diagnostics = parseGGShieldResults(JSON.parse("{}"));

    assert.strictEqual(diagnostics.length, 0);
  });
});
