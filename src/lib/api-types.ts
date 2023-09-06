export interface Occurence {
  type: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  line_start: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  index_start: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  line_end: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  index_end: number;
}

export interface Incident {
  type: string;
  occurrences: Occurence[];
  validity: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ignore_sha: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  known_secret: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  incident_url: string;
}

export interface EntityWithIncidents {
  incidents: Incident[];
}

/**
 * JSON response from ggshield scan command
 */
export interface GGShieldScanResults {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  entities_with_incidents: EntityWithIncidents[];
}
