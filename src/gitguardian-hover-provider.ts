import * as vscode from "vscode";

export class GitGuardianSecretHoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);

    for (const diagnostic of diagnostics) {
      if (
        diagnostic.range.contains(position) &&
        diagnostic.source === "gitguardian"
      ) {
        const hoverMessage = new vscode.MarkdownString();
        hoverMessage.isTrusted = true;

        const diagnosticData = diagnosticToJSON(diagnostic);
        const encodedDiagnosticData = encodeURIComponent(diagnosticData);

        hoverMessage.appendMarkdown(
          `[GitGuardian: Ignore Secret](command:gitguardian.ignoreSecret?${encodedDiagnosticData} "Click to ignore this incident")`
        );
        return new vscode.Hover(hoverMessage, diagnostic.range);
      }
    }

    return null;
  }
}

function diagnosticToJSON(diagnostic: vscode.Diagnostic) {
  // Extract the infos useful to generate the secret name
  const { detector, secretSha } = extractInfosFromMessage(diagnostic.message);

  const diagnosticObject = {
    startLine: diagnostic.range.start.line,
    detector: detector,
    secretSha: secretSha,
  };

  // Convert the object to a JSON string
  return JSON.stringify(diagnosticObject);
}

function extractInfosFromMessage(message: string): {
  detector: string;
  secretSha: string;
} {
  const regexDetectorPattern = /Secret detected: ([a-zA-Z ]+)/;
  const regexShaPattern = /Secret SHA: ([a-zA-Z0-9]+)/;

  const matchDetector = message.match(regexDetectorPattern);
  const matchSha = message.match(regexShaPattern);

  if (matchDetector && matchSha) {
    const detector = matchDetector[1].trim();
    const secretSha = matchSha[1].trim();
    return { detector, secretSha };
  } else {
    throw new Error("No match found");
  }
}

export function generateSecretName(
  currentFile: string,
  uriDiagnostic: any
): string {
  return `${uriDiagnostic.detector} - ${currentFile}:l.${uriDiagnostic.startLine}`;
}
