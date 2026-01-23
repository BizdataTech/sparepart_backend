import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId },
    items: [
      { productId: { type: mongoose.Schema.Types.ObjectId }, quantity: Number },
    ],
    totalAmount: { type: Number },
    deliveryAddress: {
      name: String,
      address: String,
      house_number: Number,
      street: String,
      city: String,
      district: String,
      state: String,
      pincode: Number,
      phone_number: Number,
    },
    paymentMethod: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
    },
    orderStatusHistory: [
      {
        status: {
          type: String,
          enum: ["placed", "confirmed", "shipped", "delivered", "cancelled"],
        },
        date: { type: Date, default: Date.now },
        reason: { type: String },
      },
    ],
    currentOrderStatus: {
      type: String,
      enum: ["placed", "confirmed", "shipped", "delivered", "cancelled"],
      default: "placed",
    },
    orderNumber: { type: String },
  },
  { timestamps: true },
);

const Order = mongoose.model("order", Schema);

export default Order;
