import * as assert from "assert";
import { extensions, commands,} from "vscode";

suite("Extension Functionality Tests", () => {

  test("Extension activates successfully", async () => {
    const ext = extensions.getExtension("gitguardian-secret-security.gitguardian");
    await ext?.activate();
    assert.ok(ext?.isActive, "Extension should be active");
  });

  test("Commands are registered", async () => {
    const commandIds = [
        "gitguardian.quota",
        "gitguardian.ignore",
        "gitguardian.authenticate",
        "gitguardian.logout",
        "gitguardian.showOutput",
        "gitguardian.openSidebar",
        "gitguardian.openProblems",
        "gitguardian.refreshQuota",
        "gitguardian.showOutput"
    ];

    const registered = await commands.getCommands(true);
    const gitguardianCommands = registered.filter(command => command.startsWith("gitguardian"));

    for (const command of commandIds) {
        assert.ok(gitguardianCommands.includes(command), `Command ${command} should be registered`);
    }
  });

});
