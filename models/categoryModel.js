import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: { type: String },
    level: { type: Number, required: true },
    navbar: { type: Boolean },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "category",
    },
    variants: [{ label: { type: String }, values: [String] }],
    sections: [
      {
        section_title: { type: String },
        attributes: [
          {
            _id: false,
            label: String,
            field_type: String,
            options: { type: [String], default: null },
          },
        ],
      },
    ],
    categoryProductCount: { type: Number, default: 1 },
    isDeleted: { type: Boolean },
  },
  { timestamps: true }
);

const Category = mongoose.model("category", CategorySchema);

export default Category;
