import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/autoCategoryController.js";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";
const router = express.Router();

router.get("/auto-categories", getCategories);
router.get("/auto-categories/:id", getCategoryById);
router.post("/auto-categories", authenticateAdmin, createCategory);
router.put("/auto-categories/:id", authenticateAdmin, updateCategory);
router.delete("/auto-categories/:id", authenticateAdmin, deleteCategory);

export default router;
