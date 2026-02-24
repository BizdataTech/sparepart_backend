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
import authenticateAdmin from "../middlewares/authenticateAdmin.js";

const router = express.Router();

router.post(
  "/auto-products",
  authenticateAdmin,
  upload.array("image"),
  createProduct,
);
router.patch(
  "/auto-products/:id",
  authenticateAdmin,
  multer({ storage: multer.memoryStorage() }).array("image"),
  updateProduct,
);
router.get("/auto-products", getProducts);
router.get("/auto-products/:id", getProduct);
router.delete("/auto-products/:id", authenticateAdmin, deleteProduct);

export default router;
