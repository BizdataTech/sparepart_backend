import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    brand_name: { type: String },
    image: {
      url: String,
      public_id: String,
    },
  },
  { timestamps: true },
);

const Brand = mongoose.model("brand", Schema);

export default Brand;
