import * as vscode from "vscode";
import { GitGuardianDiagnostic } from "../lib/ggshield-results-parser";

type FindingsNode = FileNode | SecretNode | MatchNode;

class FileNode extends vscode.TreeItem {
  constructor(
    public readonly uri: vscode.Uri,
    public readonly diagnostics: GitGuardianDiagnostic[],
  ) {
    super(
      vscode.workspace.asRelativePath(uri),
      vscode.TreeItemCollapsibleState.Expanded,
    );
    this.resourceUri = uri;
    const secretCount = new Set(diagnostics.map((d) => d.secretSha)).size;
    this.description = `${secretCount} secret${secretCount === 1 ? "" : "s"}`;
    this.contextValue = "gitguardianFindingsFile";
  }
}

class SecretNode extends vscode.TreeItem {
  constructor(
    public readonly uri: vscode.Uri,
    public readonly diagnostics: GitGuardianDiagnostic[],
  ) {
    const first = diagnostics[0];
    const isSingle = diagnostics.length === 1;
    super(
      first.detector || "Secret",
      isSingle
        ? vscode.TreeItemCollapsibleState.None
        : vscode.TreeItemCollapsibleState.Collapsed,
    );
    this.iconPath = new vscode.ThemeIcon(
      "warning",
      new vscode.ThemeColor("editorWarning.foreground"),
    );
    this.contextValue = "gitguardianFindingsItem";
    if (isSingle) {
      this.description = `Line ${first.range.start.line + 1}`;
      const tooltip = new vscode.MarkdownString();
      tooltip.appendCodeblock(first.message, "text");
      this.tooltip = tooltip;
      this.command = {
        command: "vscode.open",
        title: "Open Finding",
        arguments: [uri, { selection: first.range }],
      };
    } else {
      this.description = `${diagnostics.length} matches`;
    }
  }
}

class MatchNode extends vscode.TreeItem {
  constructor(
    public readonly uri: vscode.Uri,
    public readonly diagnostic: GitGuardianDiagnostic,
  ) {
    super(
      diagnostic.matchType || "match",
      vscode.TreeItemCollapsibleState.None,
    );
    this.description = `Line ${diagnostic.range.start.line + 1}`;
    const tooltip = new vscode.MarkdownString();
    tooltip.appendCodeblock(diagnostic.message, "text");
    this.tooltip = tooltip;
    this.command = {
      command: "vscode.open",
      title: "Open Finding",
      arguments: [uri, { selection: diagnostic.range }],
    };
    this.contextValue = "gitguardianFindingsItem";
  }
}

function groupBySecret(
  diagnostics: GitGuardianDiagnostic[],
): GitGuardianDiagnostic[][] {
  const groups = new Map<string, GitGuardianDiagnostic[]>();
  for (const d of diagnostics) {
    const key = d.secretSha;
    const group = groups.get(key);
    if (group) {
      group.push(d);
    } else {
      groups.set(key, [d]);
    }
  }
  return Array.from(groups.values()).map((group) =>
    group.slice().sort((a, b) => a.range.start.line - b.range.start.line),
  );
}

export class GitGuardianFindingsProvider
  implements vscode.TreeDataProvider<FindingsNode>, vscode.Disposable
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    FindingsNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly diagnosticsListener: vscode.Disposable;
  // Tracks URIs that currently have GitGuardian diagnostics so we can detect
  // when GG diagnostics are removed (the post-change `getDiagnostics(uri)` call
  // alone can't tell us a GG diagnostic just disappeared from this URI).
  private readonly ggUris = new Set<string>();

  constructor() {
    this.diagnosticsListener = vscode.languages.onDidChangeDiagnostics((e) => {
      let relevant = false;
      for (const uri of e.uris) {
        const key = uri.toString();
        const hasGG = vscode.languages
          .getDiagnostics(uri)
          .some((d) => d.source?.trim() === "gitguardian");
        const hadGG = this.ggUris.has(key);
        if (hasGG) {
          this.ggUris.add(key);
        } else if (hadGG) {
          this.ggUris.delete(key);
        }
        if (hasGG || hadGG) {
          relevant = true;
        }
      }
      if (relevant) {
        this._onDidChangeTreeData.fire();
      }
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FindingsNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FindingsNode): FindingsNode[] {
    if (!element) {
      return vscode.languages
        .getDiagnostics()
        .map(([uri, diagnostics]) => {
          const ggDiagnostics = diagnostics.filter(
            (d) => d.source?.trim() === "gitguardian",
          ) as GitGuardianDiagnostic[];
          return ggDiagnostics.length > 0
            ? new FileNode(uri, ggDiagnostics)
            : undefined;
        })
        .filter((node): node is FileNode => node !== undefined)
        .sort((a, b) => (a.label as string).localeCompare(b.label as string));
    }
    if (element instanceof FileNode) {
      return groupBySecret(element.diagnostics)
        .sort((a, b) => a[0].range.start.line - b[0].range.start.line)
        .map((group) => new SecretNode(element.uri, group));
    }
    if (element instanceof SecretNode && element.diagnostics.length > 1) {
      return element.diagnostics.map((d) => new MatchNode(element.uri, d));
    }
    return [];
  }

  dispose(): void {
    this.diagnosticsListener.dispose();
    this._onDidChangeTreeData.dispose();
  }
}
