import { Request, Response } from "express";
import User from "../model/User";
import { generateToken, clearToken } from "../utils/auth";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthenticationError } from "../middleware/errorMiddleware";
import asyncHandler from "express-async-handler";

const registerUser = async (req: Request, res: Response) => {
  console.log("req.body: " + JSON.stringify(req.body));
  const { first_name, last_name, email, password } = req.body;
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400).json({ message: "The user already exists" });
  }

  const user = await User.create({
    first_name,
    last_name,
    email,
    password,
  });

  if (user) {
    // Generate a token and send it in the response
    const token = generateToken(res, user._id);
    res.status(201).json({
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      api_token: token,
    });
  } else {
    res.status(400).json({ message: "An error occurred in creating the user" });
  }
};

const authenticateUser = async (req: Request, res: Response) => {
  console.log("req.body: ", JSON.stringify(req.body));
  const { first_name, last_name, email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (user.comparePassword(password))) {
    // Generate a token and send it in the response
    const token = generateToken(res, user._id);
    res.status(201).json({
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      api_token: token,
    });
  } else {
    res.status(401).json({ message: "User not found / password incorrect" });
  }
};

const logoutUser = (req: Request, res: Response) => {
    // Clear the token from the response
    clearToken(res);
    res.status(200).json({ message: "User logged out" });
};

const verifyToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.body.api_token;

  if (!token) {
    throw new AuthenticationError("Token not found");
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || "";
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    if (!decoded || !decoded.userId) {
      throw new AuthenticationError("UserId not found");
    }

    const user = await User.findById(decoded.userId, "_id first_name last_name email");

    if (!user) {
      throw new AuthenticationError("User not found");
    }

    res.status(200).json(user);
  } catch (e) {
    res.status(401).json({ message: "Invalid token" });
  }
});

export { registerUser, authenticateUser, verifyToken, logoutUser };
