import express from "express";
import {
  createUser,
  getAdmin,
  loginUser,
  logoutAdminUser,
} from "../controllers/AdminUserController.js";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";

const router = express.Router();

router.get("/admin-users/verify", authenticateAdmin, getAdmin);
router.post("/admin-users/sign-up", createUser);
router.post("/admin-users/sign-in", loginUser);
router.post("/admin-users/logout", logoutAdminUser);

export default router;
