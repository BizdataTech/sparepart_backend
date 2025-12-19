import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "autoproduct" },
        price: Number,
        quantity: { type: Number },
        totalAmount: { type: Number },
      },
    ],
    cartTotal: { type: Number },
  },
  { timestamps: true }
);

const Cart = mongoose.model("cart", Schema);

export default Cart;
