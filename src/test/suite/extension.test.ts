import * as assert from "assert";
import { extensions, commands } from "vscode";

suite("activate", () => {
  test("Should activate extension successfully", async () => {
    const ext = extensions.getExtension(
      "gitguardian-secret-security.gitguardian"
    );
    await ext?.activate();
    assert.ok(ext?.isActive, "Extension should be active");
  });

  test("Should register all gitguardian commands", async () => {
    const commandIds = [
      "gitguardian.quota",
      "gitguardian.ignore",
      "gitguardian.authenticate",
      "gitguardian.logout",
      "gitguardian.showOutput",
      "gitguardian.openSidebar",
      "gitguardian.openProblems",
      "gitguardian.refreshQuota",
      "gitguardian.showOutput",
    ];

    const registered = await commands.getCommands(true);
    const gitguardianCommands = registered.filter((command) =>
      command.startsWith("gitguardian")
    );

    for (const command of commandIds) {
      assert.ok(
        gitguardianCommands.includes(command),
        `Command ${command} should be registered`
      );
    }
  });
});
