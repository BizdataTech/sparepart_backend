import express from "express";
import { createOrder } from "../controllers/orderController.js";
import verifyUser from "../middlewares/authentication2.js";

const router = express.Router();

router.post("/order", verifyUser, createOrder);

export default router;
