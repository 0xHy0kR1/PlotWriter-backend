import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../model/User";
import asyncHandler from "express-async-handler";
import { AuthenticationError } from "./errorMiddleware";
import dotenv from "dotenv";

dotenv.config();

const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let token = req.cookies.jwt;
      console.log("token ", token)

      if (!token) {
        throw new AuthenticationError("Token not found");
      }

      console.log("after token if")
      const jwtSecret = process.env.JWT_SECRET || "";
      console.log("jwt secret"+jwtSecret);
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      console.log("decoded: ", JSON.stringify(decoded));

      if (!decoded || !decoded.userId) {
        throw new AuthenticationError("UserId not found");
      }

      const user = await User.findById(decoded.userId, "_id name email");

      if (!user) {
        throw new AuthenticationError("User not found");
      }

      req.user = user;
      next();
    } catch (e) {
      throw new AuthenticationError("Invalid token");
    }
  }
);

export { authenticate };