export class GGShieldConfiguration {
  ggshieldPath: string;
  apiUrl: string;
  apiKey: string;
  allowSelfSigned: boolean;

  constructor(
    ggshieldPath: string = "",
    apiUrl: string = "",
    apiKey: string = "",
    allowSelfSigned: boolean = false
  ) {
    this.ggshieldPath = ggshieldPath;
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.allowSelfSigned = allowSelfSigned;
  }
}
