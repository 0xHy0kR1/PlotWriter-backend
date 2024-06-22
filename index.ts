import express from "express";
import authRouter from "./routes/authRoutes";
import connectoUserDB from "./db";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes";
import scriptRoutes from "./routes/scriptRoutes";
import { authenticate } from "./middleware/authMiddleware";
import { errorHandler } from "./middleware/errorMiddleware";

dotenv.config();

interface UserBasicInfo {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserBasicInfo | null;
    }
  }
}

const app = express();
const port = process.env.PORT || 8000;
app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(cookieParser());

app.use(bodyParser.json()); // To recognize the req obj as a json obj
app.use(bodyParser.urlencoded({ extended: true })); // To recognize the req obj as strings or arrays. extended true to handle nested objects also

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.use(authRouter);
app.use("/users", authenticate, userRoutes);
app.use("/scripts", authenticate, scriptRoutes);

app.use(errorHandler);

connectoUserDB();