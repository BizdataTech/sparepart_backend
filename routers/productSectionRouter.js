import express from "express";
import {
  createProductSection,
  getProductSectionData,
} from "../controllers/producSectionController.js";

let router = express.Router();

router.post("/product-sections", createProductSection);
router.get("/product-sections", getProductSectionData);

export default router;
