import express from "express";
import { createBrand, getBrands } from "../controllers/brandController.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

router.post("/brands", upload.single("image"), createBrand);
router.get("/brands", getBrands);

export default router;
