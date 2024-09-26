# GitGuardian's ggshield VSCode extension

## Table of content

- [GitGuardian's ggshield VSCode extension](#gitguardians-ggshield-vscode-extension)
  - [Table of contents](#table-of-contents)
  - [Description](#description)
    - [Features](#features)
  - [Getting started](#getting-started)
    - [Scan for secrets](#scan-for-secrets)
    - [How to remediate incidents?](#how-to-remediate-incidents)
    - [Ignore secrets (only when working in a workspace)](#ignore-secrets-only-when-working-in-a-workspace)
    - [Check my quota](#check-my-quota)
  - [Support, Feedback, Contributing](#support-feedback-contributing)
  - [Release Notes](#release-notes)
  - [License](#license)

## Description

This extension helps you detect more than 400+ types of secrets directly from VSCode using [ggshield](https://www.gitguardian.com/ggshield)) CLI application.

NB: The extension uses the quota of secret detection of your ggshield API token.

### Features

- When a file is saved, it is scanned using the ggshield CLI application
- Found incidents are highlighted in code and available in the `Problems` panel as warnings
- Secrets can be ignored running the command `ggshield: Ignore last found incidents` or via the UI
- The API quota can be checked running the command `ggshield: Show quota`

![Incident highlighted](./doc/incident_highlighted_dark.png)

## Getting started

### Scan for secrets

The scanning is triggered automatically when saving a file. Incidents are highlighted in file and available in the `Problems` panel as warnings.

### How to remediate incidents?

For more info on how to remediate incidents, you can take a look at GitGuardian's [documentation](https://docs.gitguardian.com/internal-repositories-monitoring/remediate/remediate-incidents).

### Ignore secrets (only when working in a workspace)

Right after saving a file if incidents were found run the command `ggshield: Ignore last found incidents`.
This will create and fill the ggshield file `.gitguardian.yaml` at the root of the workspace and ignore the secrets found. See ggshield's [documentation](https://docs.gitguardian.com/ggshield-docs/reference/secret/ignore) for info.

### Check my quota

Run the command `ggshield: Show quota` from VSCode command palette to check the current status of your API quota.

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports etc. via GitHub issues. Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our Contribution Guidelines.

## Release Notes

See [Change log](./CHANGELOG.md)

## License

ggshield and this extension are MIT licensed.
