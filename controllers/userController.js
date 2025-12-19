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

// logout user
export const logoutUser = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ success: true, message: "User Logged Out" });
};
