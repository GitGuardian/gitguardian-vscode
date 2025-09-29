/* eslint-disable @typescript-eslint/naming-convention */
export interface Occurrence {
  type: string;
  line_start: number;
  index_start: number;
  line_end: number;
  index_end: number;
}

export type Validity =
  | "unknown"
  | "cannot_check"
  | "no_checker"
  | "failed_to_check"
  | "not_checked"
  | "invalid"
  | "valid";

type IncidentVaultProperties = {
  secret_vaulted: false;
} | {
  secret_vaulted: true;
  vault_type: string;
  vault_name: string;
  vault_path: string;
  vault_path_count: number;
}

export type Incident = {
  type: string;
  occurrences: Occurrence[];
  validity: Validity;
  ignore_sha: string;
  known_secret: boolean;
  incident_url: string;
  total_occurrences: number;
} & IncidentVaultProperties

export interface EntityWithIncidents {
  incidents: Incident[];
}

/**
 * JSON response from ggshield scan command
 */
export interface GGShieldScanResults {
  entities_with_incidents: EntityWithIncidents[];
}
