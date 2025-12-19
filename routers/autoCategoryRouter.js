import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/autoCategoryController.js";
const router = express.Router();

router.get("/auto-categories", getCategories);
router.get("/auto-categories/:id", getCategoryById);
router.post("/auto-categories", createCategory);
router.put("/auto-categories/:id", updateCategory);
router.delete("/auto-categories/:id", deleteCategory);

export default router;
