import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import getToken from "../utils/getToken.js";
import verifyPassword from "../utils/verifyPassword.js";
import mongoose from "mongoose";

const getUserData = async (id) => {
  let data = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $project: {
        username: 1,
        email: 1,
        addresses: 1,
      },
    },
  ]);
  return data[0];
};

export const verifyState = async (req, res) => {
  try {
    let user = await User.findById(req.userId).select("_id");
    res.json({ user: user._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUser = async (req, res) => {
  try {
    let { id } = req.params;
    let user = await getUserData(id);
    console.log("user fetch data:", user);
    res.json({ user });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    let matchingUser = await User.findOne({ email });
    if (matchingUser) {
      return res.status(400).json({ message: "Email already taken" });
    }
    const hashedPasword = await bcrypt.hash(password, 10);
    const new_user = await User.create({
      username,
      email,
      password: hashedPasword,
    });

    const token = getToken(new_user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    // restrict fields
    res
      .status(200)
      .json({ message: "User Successfully Created", user: new_user._id });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// sign in user
export const signinUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    let matchingUser = await User.findOne({ email }).select("_id password");
    if (!matchingUser) {
      return res.status(401).json({ message: "Invalid Email or Password" });
    }
    const compareResult = await verifyPassword(password, matchingUser.password);
    if (!compareResult) {
      return res.status(401).json({ message: "Invalid Email or Password" });
    }
    let token = getToken(matchingUser._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res
      .status(200)
      .json({ message: "User Authenticated", user: matchingUser._id });
  } catch (error) {
    console.error("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const addAddress = async (req, res) => {
  try {
    let result = await User.findByIdAndUpdate(req.userId, {
      $push: { addresses: req.body },
    });
    return res.json({ message: "user updated with address" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAddress = async (req, res) => {
  try {
    let address = await User.findOne(
      {
        _id: req.userId,
        "addresses._id": req.params.id,
      },
      { "addresses.$": 1 }
    );
    return res.json({ address: address.addresses[0] });
  } catch (error) {
    console.log("address fetch error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const updateAddress = async (req, res) => {
  try {
    let userId = req.userId;

    await User.findByIdAndUpdate(userId, {
      $set: { "addresses.$[].default": false },
    });

    await User.updateOne(
      { _id: userId, "addresses._id": req.params.id },
      {
        $set: {
          "addresses.$.default": req.body.default,
        },
      }
    );

    res.json({ message: "address updated" });
  } catch (error) {
    console.log("update error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    let { id } = req.params;
    console.log("address id:", id);
    await User.findByIdAndUpdate(req.userId, {
      $pull: { addresses: { _id: id } },
    });
    res.json({ message: "Address Deleted" });
  } catch (error) {
    console.log("address deletion failure:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// wishlist
export const getWishlistProducts = async (req, res) => {
  try {
    let user_wishlist = await User.findById(req.userId, { wishlist: 1 });
    console.log("user wishlist:", user_wishlist);
    if (!user_wishlist || user_wishlist.wishlist.length === 0)
      return res.json({ products: [] });
    let products = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.userId) } },
      { $unwind: "$wishlist" },
      {
        $lookup: {
          from: "autoproducts",
          localField: "wishlist.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 1,
          "wishlist.addedAt": 1,
          "product._id": 1,
          "product.product_title": 1,
          "product.brand": 1,
          "product.price": 1,
          "product.images": 1,
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "product.brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },
      {
        $addFields: {
          "product.brand": "$brand",
        },
      },
      { $sort: { "wishlist.addedAt": 1 } },
      {
        $group: {
          _id: "$_id",
          wishlist: {
            $push: "$product",
          },
        },
      },
    ]);
    console.log("wishlist products:", products[0].wishlist);
    return res.json({ products: products[0].wishlist });
  } catch (error) {
    console.log("failed to fetch wishlist products:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const getData = async (req, res) => {
  try {
    let { id } = req.params;
    let matching_product = await User.findOne({
      _id: req.userId,
      "wishlist.productId": id,
    });
    if (matching_product) return res.json({ result: true });
    return res.json({ result: false });
  } catch (error) {
    console.log("failed to fetch product wishlist data.", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    let { productId } = req.body;
    let matching_product = await User.findOne({
      _id: req.userId,
      "wishlist.productId": { $in: [productId] },
    });
    if (matching_product)
      return res
        .status(409)
        .json({ message: "Failed : Product already exist in wishlist" });
    console.log(matching_product ? true : false);
    await User.updateOne(
      { _id: req.userId },
      { $addToSet: { wishlist: { productId, addedAt: new Date() } } }
    );
    return res.json({ message: "product added to wishlist" });
  } catch (error) {
    console.log("failed to add product in wishlist:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    let { productId } = req.params;
    console.log("productId:", productId);
    await User.updateOne(
      { _id: req.userId },
      { $pull: { wishlist: { productId } } }
    );
    return res.json({ message: "product removed from db" });
  } catch (error) {
    console.log("failed to remover product from wishlist", error.message);
    res.status(500).json({ message: error.message });
  }
};

// logout user
export const logoutUser = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ success: true, message: "User Logged Out" });
};
