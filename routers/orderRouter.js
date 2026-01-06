import express from "express";
import {
  createOrder,
  getAllOrders,
  getOrderData,
} from "../controllers/orderController.js";
import verifyUser from "../middlewares/authentication2.js";

const router = express.Router();

router.post("/orders", verifyUser, createOrder);
router.get("/orders/:id", verifyUser, getOrderData);
router.get("/orders", verifyUser, getAllOrders);

export default router;
