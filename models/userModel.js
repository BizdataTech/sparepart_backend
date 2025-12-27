import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    wishlist: [
      { productId: { type: mongoose.Schema.Types.ObjectId }, addedAt: Date },
    ],
    addresses: [
      {
        address: String,
        house_number: Number,
        street: String,
        city: String,
        district: String,
        state: String,
        pincode: Number,
        phone_number: Number,
        default: { type: Boolean, default: false },
      },
    ],
    blocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model("user", UserSchema);

export default User;
