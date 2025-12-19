import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  section_title: { type: String },
  attributes: [{ label: String, fiel_type: String }],
});

const ProductSection = mongoose.model("Section", Schema);

export default ProductSection;
