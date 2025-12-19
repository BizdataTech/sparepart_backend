import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  product_title: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "AutoCategory" },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: "brand" },
  product_type: { type: "String", enum: ["genuine", "oem", "after_market"] },
  genuine_reference: { type: mongoose.Schema.Types.ObjectId, default: null },
  description: { type: String },
  part_number: { type: String },
  price: { type: Number },
  stock: { type: Number },
  images: { type: [String] },
  attributes: [{ label: String, value: String }],
  fitments: [mongoose.Schema.Types.ObjectId],
});

const AutoProduct = mongoose.model("autoproduct", Schema);

export default AutoProduct;
