import express from "express";
import {
  createUser,
  deleteUser,
  getAdmin,
  getAppUsers,
  loginUser,
  logoutAdminUser,
  toggleUserStat,
} from "../controllers/AdminUserController.js";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";

const router = express.Router();

router.get("/users", getAppUsers);
router.patch("/users/:id/toggle-user", toggleUserStat);
router.delete("/users/:id", deleteUser);
router.get("/admin-users/verify", authenticateAdmin, getAdmin);
router.post("/admin-users/sign-up", createUser);
router.post("/admin-users/sign-in", loginUser);
router.post("/admin-users/logout", logoutAdminUser);

export default router;
