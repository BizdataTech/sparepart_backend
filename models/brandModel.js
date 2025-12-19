import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  brand_name: { type: String },
  image: { type: String },
});

const Brand = mongoose.model("brand", Schema);

export default Brand;
