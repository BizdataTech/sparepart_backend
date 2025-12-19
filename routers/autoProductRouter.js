import express from "express";
import {
  createProduct,
  getProduct,
  getProducts,
} from "../controllers/AutoProductController.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

router.post("/auto-products", upload.array("image"), createProduct);
router.get("/auto-products", getProducts);
router.get("/auto-products/:id", getProduct);

export default router;
