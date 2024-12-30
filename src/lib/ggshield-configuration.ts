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
    this.allowSelfSigned = allowSelfSigned;
    if (apiUrl === "https://api.gitguardian.com/v1") {
      this.apiUrl = "https://dashboard.gitguardian.com/v1";
  } else if (apiUrl === "https://api.eu1.gitguardian.com/v1") {
    this.apiUrl = "https://dashboard.eu1.gitguardian.com/v1";
  }
  else {
    this.apiUrl = apiUrl;
  }
  }
}

