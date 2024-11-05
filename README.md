# GitGuardian for VSCode

Simply install the extension and let GitGuardian protect you from accidentally exposing secrets in your code. With GitGuardian, you can code with confidence, knowing that your sensitive information is safe from leaks.

We detect more than 400+ types of secrets directly from VSCode using [GitGuardian CLI (ggshield)](https://www.gitguardian.com/ggshield).

### Features

- When a file is saved, it is scanned using the GitGuardian CLI (ggshield) application bundled with the extension
- Found secrets are highlighted in code and available in the `Problems` panel as warnings
- Secrets can be ignored running the command `gitguardian: Ignore last found incidents` or via the UI
- Your API quota can be checked running the command `gitguardian: Show quota`

![Incident highlighted](https://raw.githubusercontent.com/GitGuardian/gitguardian-vscode/main/doc/incident_highlighted_dark.png)

## Getting started

### Authentication

Once the extension is installed, simply click on "Link your IDE to your account" for automatic authentication. If you are a user with an on-premise instance of GitGuardian, go to the extension settings to enter your URL and API key.

### Scan for secrets

The scanning is triggered automatically when saving a file. Incidents are highlighted in file and available in the `Problems` panel as warnings.

### How to remediate incidents?

Remediation guidelines are conveniently displayed directly in the extension's side panel. Your security team can customize these messages to provide you with the most accurate information, enabling you to address issues promptly and effectively.

For more info on how to remediate incidents, you can take a look at GitGuardian's [documentation](https://docs.gitguardian.com/internal-repositories-monitoring/remediate/remediate-incidents).

### Ignore secrets (only when working in a workspace)

Immediately after saving a file, if any incidents are detected, you can hover over the identified secret and click on "GitGuardian: Ignore Secret."

This action will create or update the .gitguardian.yaml file in the root of your workspace, allowing you to ignore the detected secrets.

For more information, please refer to the GitGuardian CLI (ggshield) documentation.

### Check my quota

Run the command `gitguardian: Show quota` from VSCode command palette to check the current status of your API quota.

With a free personal account, you have access to 10,000 API calls each month.

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports etc.

If you need support or found a bug : https://github.com/GitGuardian/gitguardian-vscode/issues/new/choose

For ideas and general discussions : https://github.com/GitGuardian/gitguardian-vscode/discussions

Security reports : Please report it using our [Vulnerability Disclosure Portal](https://vdp.gitguardian.com).

## Release Notes

See [Change log](https://github.com/GitGuardian/gitguardian-vscode/blob/main/CHANGELOG.md)

## License

GitGuardian CLI (ggshield) and this extension are MIT licensed.
