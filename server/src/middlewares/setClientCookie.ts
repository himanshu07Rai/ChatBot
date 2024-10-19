import { NextFunction, Request, Response } from "express";
import { isProdEnv } from "../utils/helper";
import { v4 as uuidv4 } from "uuid";

export const setClientCookie = (req: Request, res: Response, next: NextFunction) => {
    console.log("Middleware - Assigning unique clientId");
  if (!req.cookies?.clientId) {
    const uniqueClientId = uuidv4(); // Generate a new UUID
    res.cookie("clientId", uniqueClientId, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      path: "/",
      sameSite:isProdEnv() ? "none" : "lax", // Lax is more permissive for local dev
      secure: isProdEnv(), // Only secure cookies in production
    });
    req.clientId = uniqueClientId;
    console.log(`Assigned new clientId: ${uniqueClientId}`);
  } else {
    req.clientId = req.cookies.clientId;
    console.log(`Returning clientId: ${req.clientId}`);
  }
  next()
}
