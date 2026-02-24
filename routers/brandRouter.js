import express from "express";
import {
  createBrand,
  deleteBrand,
  getBrands,
  updateBrand,
} from "../controllers/brandController.js";
import upload from "../middlewares/multer.js";
import multer from "multer";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";

const router = express.Router();

router.post("/brands", authenticateAdmin, upload.single("image"), createBrand);
router.patch(
  "/brands/:id",
  authenticateAdmin,
  multer({ storage: multer.memoryStorage() }).single("image"),
  updateBrand,
);
router.get("/brands", getBrands);
router.delete("/brands/:id", authenticateAdmin, deleteBrand);

export default router;
