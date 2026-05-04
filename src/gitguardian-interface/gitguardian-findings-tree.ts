import * as vscode from "vscode";
import { extractInfosFromMessage } from "./gitguardian-hover-provider";

type FindingsNode = FileNode | FindingNode;

class FileNode extends vscode.TreeItem {
  constructor(
    public readonly uri: vscode.Uri,
    public readonly diagnostics: vscode.Diagnostic[],
  ) {
    super(
      vscode.workspace.asRelativePath(uri),
      vscode.TreeItemCollapsibleState.Expanded,
    );
    this.resourceUri = uri;
    const count = diagnostics.length;
    this.description = `${count} secret${count === 1 ? "" : "s"}`;
    this.contextValue = "gitguardianFindingsFile";
  }
}

class FindingNode extends vscode.TreeItem {
  constructor(
    public readonly uri: vscode.Uri,
    public readonly diagnostic: vscode.Diagnostic,
  ) {
    let detector = "Secret";
    try {
      detector = extractInfosFromMessage(diagnostic.message).detector;
    } catch {
      // Fall back to the generic label if the message format is unexpected.
    }
    super(detector, vscode.TreeItemCollapsibleState.None);
    this.description = `Line ${diagnostic.range.start.line + 1}`;
    const tooltip = new vscode.MarkdownString();
    tooltip.appendCodeblock(diagnostic.message, "text");
    this.tooltip = tooltip;
    this.iconPath = new vscode.ThemeIcon(
      "warning",
      new vscode.ThemeColor("editorWarning.foreground"),
    );
    this.command = {
      command: "vscode.open",
      title: "Open Finding",
      arguments: [uri, { selection: diagnostic.range }],
    };
    this.contextValue = "gitguardianFindingsItem";
  }
}

export class GitGuardianFindingsProvider
  implements vscode.TreeDataProvider<FindingsNode>, vscode.Disposable
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    FindingsNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly diagnosticsListener: vscode.Disposable;

  constructor() {
    this.diagnosticsListener = vscode.languages.onDidChangeDiagnostics(() => {
      this._onDidChangeTreeData.fire();
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
          );
          return ggDiagnostics.length > 0
            ? new FileNode(uri, ggDiagnostics)
            : undefined;
        })
        .filter((node): node is FileNode => node !== undefined)
        .sort((a, b) => (a.label as string).localeCompare(b.label as string));
    }
    if (element instanceof FileNode) {
      return element.diagnostics
        .slice()
        .sort((a, b) => a.range.start.line - b.range.start.line)
        .map((d) => new FindingNode(element.uri, d));
    }
    return [];
  }

  dispose(): void {
    this.diagnosticsListener.dispose();
    this._onDidChangeTreeData.dispose();
  }
}
