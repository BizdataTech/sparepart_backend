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

const router = express.Router();

router.post("/orders", verifyUser, createOrder);
router.get("/orders", verifyUser, getAllOrders);
router.get("/admin/orders", getAllClientOrders);
router.get("/orders/:id", verifyUser, getOrderData);
router.get("/admin/orders/:id", getClientOrderDetails);
router.patch("/admin/orders/:id/confirm", confirmOrder);

export default router;
