export class GGShieldConfiguration {
  ggshieldPath: string;
  apiUrl: string;
  insecure: boolean;

  constructor(
    ggshieldPath: string = "",
    apiUrl: string = "",
    insecure: boolean = false,
  ) {
    this.ggshieldPath = ggshieldPath;
    this.apiUrl = apiUrl;
    this.insecure = insecure;
  }
}
