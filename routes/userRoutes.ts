import express from "express";
import { getUser } from "../controllers/userController";
import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/:id", getUser);

export default router;