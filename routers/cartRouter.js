import express from "express";
import {
  addToCart,
  clearCart,
  getCart,
  getData,
  removeCartItem,
  updateCartItem,
} from "../controllers/cartController.js";
import verifyUser from "../middlewares/authentication2.js";
const router = express.Router();

router.get("/cart/product/:id", verifyUser, getData);
router.get("/cart", verifyUser, getCart);
router.post("/cart", verifyUser, addToCart);
router.patch("/cart/item/:id", verifyUser, updateCartItem);
router.delete("/cart/item/:id", verifyUser, removeCartItem);
router.delete("/cart", verifyUser, clearCart);

export default router;
