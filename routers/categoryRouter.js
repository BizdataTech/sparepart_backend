import express from "express";
import {
  createCategory,
  deleteAllCategories,
  deleteCategory,
  getCategories,
  getCategoryById,
  getCategoryProductCode,
  updateCategory,
} from "../controllers/categoryController.js";
const router = express.Router();

router.get("/categories/:id", getCategoryById);
router.get("/categories", getCategories);
router.get("/categories/product-code/:id", getCategoryProductCode);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);
router.delete("/categories", deleteAllCategories);

export default router;
