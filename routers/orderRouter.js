import express from "express";
import {
  confirmOrder,
  createOrder,
  getAllClientOrders,
  getAllOrders,
  getClientOrderDetails,
  getOrderData,
} from "../controllers/orderController.js";
import verifyUser from "../middlewares/authentication2.js";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";

const router = express.Router();

router.post("/orders", verifyUser, createOrder);
router.get("/orders", verifyUser, getAllOrders);
router.get("/admin/orders", authenticateAdmin, getAllClientOrders);
router.get("/orders/:id", verifyUser, getOrderData);
router.get("/admin/orders/:id", getClientOrderDetails);
router.patch("/admin/orders/:id/confirm", authenticateAdmin, confirmOrder);

export default router;
