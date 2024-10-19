// typings.d.ts
import { Request } from "express";

declare module "express-serve-static-core" {
  interface Request {
    clientId?: string; // Make clientId optional
  }
}
