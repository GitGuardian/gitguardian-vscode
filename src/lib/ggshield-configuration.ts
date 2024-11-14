export class GGShieldConfiguration {
  ggshieldPath: string;
  apiUrl: string;
  allowSelfSigned: boolean;

  constructor(
    ggshieldPath: string = "",
    apiUrl: string = "",
    allowSelfSigned: boolean = false
  ) {
    this.ggshieldPath = ggshieldPath;
    this.apiUrl = apiUrl;
    this.allowSelfSigned = allowSelfSigned;
  }
}
