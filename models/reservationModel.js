import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId },
  productId: { type: mongoose.Schema.Types.ObjectId },
  reservedStock: { type: Number },
  reservedStatus: {
    type: String,
    eum: ["acitve", "cancelled", "converted"],
    default: "active",
  },
  createdAt: { type: Date, default: Date.now },
});

const StockReservaton = mongoose.model("stockreservation", Schema);

export default StockReservaton;
