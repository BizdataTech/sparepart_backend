import express from "express";
import multer from "multer";
import { createLogo, getLogo } from "../controllers/homeController.js";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";

const router = express.Router();

router.post(
  "/admin/home/logo",
  authenticateAdmin,
  multer({ storage: multer.memoryStorage() }).single("logo"),
  createLogo,
);

router.get("/admin/home/logo", getLogo);

export default router;
