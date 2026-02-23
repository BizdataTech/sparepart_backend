import AdminUser from "../models/AdminUserModel.js";
import bcrypt from "bcrypt";
import { getAdminToken } from "../utils/adminToken.js";

export const getAdmin = async (req, res) => {
  try {
    let user = await AdminUser.findOne({ _id: req.adminId }).select(
      "username email -_id",
    );
    return res.json({ user });
  } catch (error) {
    console.log("admin failed to fetch :", error.message);
  }
};

export const createUser = async (req, res) => {
  let data = req.body;
  let { username, password, email } = data;
  try {
    if (!username.trim() || !password.trim() || !email.trim())
      return res
        .status(400)
        .json({ message: "User Registration Failed : All Fields Required" });
    const hashed_password = await bcrypt.hash(password, 10);
    const user = await AdminUser.create({
      username,
      email,
      password: hashed_password,
      role: "admin",
    });
    const token = getAdminToken(user._id);
    return res
      .cookie("admin_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      })
      .status(201)
      .json({ message: "User Created!" });
  } catch (error) {
    console.log("failed to create admin user", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;
    let credential_error = "Logging In Failed : Incorrect Email or Password";
    if (!email.trim() || !password.trim())
      return res.status(401).json({ message: credential_error });
    const admin_user = await AdminUser.findOne({ email }).select(
      "email password",
    );
    if (!admin_user) return res.status(401).json({ message: credential_error });
    let authenticated = await bcrypt.compare(password, admin_user.password);
    if (!authenticated)
      return res.status(401).json({ message: credential_error });
    let token = getAdminToken(admin_user._id);
    return res
      .cookie("admin_token", token, {
        sameSite: "lax",
        httpOnly: true,
        secure: true,
      })
      .status(201)
      .json({ message: "Log In Successfull" });
  } catch (error) {
    console.log("Failed to login user:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const logoutAdminUser = async (req, res) => {
  try {
    return res
      .clearCookie("admin_token", {
        sameSite: "lax",
        httpOnly: true,
        secure: true,
      })
      .status(200)
      .json({ message: "Logged Out Successfull" });
  } catch (error) {
    console.log("Failed to logout admin user :", error.message);
    return res.status(500).json({ message: error.message });
  }
};
