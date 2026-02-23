import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  role: { type: String, enum: ["admin"] },
});

const AdminUser = mongoose.model("adminuser", Schema);

export default AdminUser;
