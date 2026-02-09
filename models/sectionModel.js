import mongoose from "mongoose";

const SectionSchema = new mongoose.Schema(
  {
    section_type: { type: String, enum: ["banner", "product_listing"] },
    order: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, discriminatorKey: "section_type" },
);

export const Section = mongoose.model("section", SectionSchema);

const BannerSchema = new mongoose.Schema({
  secure_url: { type: String },
  public_id: { type: String },
  data_source: { type: String, enum: ["product", "category"] },
  reference_id: { type: String },
});

export const Banner = Section.discriminator("banner", BannerSchema);

const ProductListingSchema = new mongoose.Schema({
  title: { type: String },
  data_source: { type: String, enum: ["category"] },
  reference_id: { type: String },
  limit: { type: Number },
  redirection: { type: Boolean, default: false },
  layout: { type: String, enum: ["horizontal", "grid"] },
});

export const ProductListing = Section.discriminator(
  "product_listing",
  ProductListingSchema,
);
