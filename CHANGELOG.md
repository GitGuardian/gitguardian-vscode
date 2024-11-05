# GitGuardian Secret Security Changelog

## [0.4.0]
### Modified
- Load .env configuration and ensure environment specific settings are applied
- Prevent scanning gitignored files
- Status bar displays error when scanning ignored files 
### Fixed
- Stop displaying error when scanning file ignored in .gitguardian.yaml

## [0.3.0]
### Modified
- Remove API key from settings
- Improve logging for invalid settings
### Fixed
- Handled Authentication if the .gitguardian.yaml is malformed

## [0.2.0]
### modified
- Do not display CLI path in settings

## [0.1.0]

### Added
- One-Click Authentication
- Automatic Secret Scanning on Save
- Custom Remediation Guidelines
- Visibility into Usage Quota
