import express from "express";
import multer from "multer";
import { createLogo } from "../controllers/homeController.js";

const router = express.Router();

router.post(
  "/admin/home/logo",
  multer({ storage: multer.memoryStorage() }).single("logo"),
  createLogo,
);

export default router;
