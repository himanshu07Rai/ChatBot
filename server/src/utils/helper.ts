import { ENV } from "../konstants";

export function isProdEnv() {
    return process.env.APP_ENV === ENV.PROD;
  }
  
  export function isDevEnv() {
    return process.env.APP_ENV === ENV.DEV;
  }