import express from "express";
import {
  createBrand,
  getBrands,
  updateBrand,
} from "../controllers/brandController.js";
import upload from "../middlewares/multer.js";
import multer from "multer";

const router = express.Router();

router.post("/brands", upload.single("image"), createBrand);
router.patch(
  "/brands/:id",
  multer({ storage: multer.memoryStorage() }).single("image"),
  updateBrand,
);
router.get("/brands", getBrands);

export default router;
