import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  label: { type: String },
  count: { type: Number, default: 0 },
});

const OrderCountModel = mongoose.model("ordercount", Schema);

export default OrderCountModel;
