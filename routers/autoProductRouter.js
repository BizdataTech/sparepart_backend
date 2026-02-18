import express from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
} from "../controllers/AutoProductController.js";
import upload from "../middlewares/multer.js";
import multer from "multer";

const router = express.Router();

router.post("/auto-products", upload.array("image"), createProduct);
router.patch(
  "/auto-products/:id",
  multer({ storage: multer.memoryStorage() }).array("image"),
  updateProduct,
);
router.get("/auto-products", getProducts);
router.get("/auto-products/:id", getProduct);
router.delete("/auto-products/:id", deleteProduct);

export default router;
