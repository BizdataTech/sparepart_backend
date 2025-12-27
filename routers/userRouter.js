import express from "express";
import {
  logoutUser,
  signup,
  verifyState,
  signinUser,
  getUser,
  deleteAddress,
  updateAddress,
  getAddress,
  addAddress,
  addToWishlist,
  getWishlistProducts,
  removeFromWishlist,
  getData,
  getUserAddress,
} from "../controllers/userController.js";
import verifyUser from "../middlewares/authentication2.js";

const router = express.Router();

router.get("/auth/verify/me", verifyUser, verifyState);
router.get("/auth/user/:id", getUser);
router.post("/auth/register", signup);
router.post("/auth/sign-in", signinUser);
router.post("/auth/logout", logoutUser);

router.post("/users/address", verifyUser, addAddress);
router.get("/users/address", verifyUser, getUserAddress);
router.get("/users/address/:id", verifyUser, getAddress);
router.patch("/users/address/:id", verifyUser, updateAddress);
router.delete("/users/address/:id", verifyUser, deleteAddress);

router.get("/users/wishlist/product/:id", verifyUser, getData);
router.post("/users/wishlist", verifyUser, addToWishlist);
router.get("/users/wishlist", verifyUser, getWishlistProducts);
router.delete("/users/wishlist/:productId", verifyUser, removeFromWishlist);

export default router;
