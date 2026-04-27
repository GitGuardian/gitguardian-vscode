import * as vscode from "vscode";
import { GitGuardianDiagnostic } from "../lib/ggshield-results-parser";

export class GitGuardianSecretHoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);

    for (const diagnostic of diagnostics) {
      if (
        diagnostic.range.contains(position) &&
        diagnostic.source === "gitguardian"
      ) {
        const ggDiagnostic = diagnostic as GitGuardianDiagnostic;
        const hoverMessage = new vscode.MarkdownString();
        hoverMessage.isTrusted = true;

        if (ggDiagnostic.details) {
          hoverMessage.appendCodeblock(ggDiagnostic.details, "text");
        }

        const diagnosticData = diagnosticToJSON(ggDiagnostic);
        const encodedDiagnosticData = encodeURIComponent(diagnosticData);

        hoverMessage.appendMarkdown(
          `[GitGuardian: Ignore Secret (update .gitguardian.yaml)](command:gitguardian.ignoreSecret?${encodedDiagnosticData} "Click to ignore this incident")`,
        );
        return new vscode.Hover(hoverMessage, diagnostic.range);
      }
    }

    return null;
  }
}

function diagnosticToJSON(diagnostic: GitGuardianDiagnostic) {
  const diagnosticObject = {
    startLine: diagnostic.range.start.line,
    detector: diagnostic.detector,
    secretSha: diagnostic.secretSha,
  };

  return JSON.stringify(diagnosticObject);
}

export function generateSecretName(
  currentFile: string,
  uriDiagnostic: any,
): string {
  return `${uriDiagnostic.detector} - ${vscode.workspace.asRelativePath(
    currentFile,
  )}:l.${uriDiagnostic.startLine}`;
}
