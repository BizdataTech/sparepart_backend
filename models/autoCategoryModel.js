import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  title: { type: String },
  level: { type: Number },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "AutoCategory" },
  slug: String,
  data_attributes: [
    {
      _id: false,
      label: String,
      field_type: String,
      options: { type: [String], default: null },
    },
  ],
  isNavItem: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
});

const AutoCategory = mongoose.model("AutoCategory", Schema);

export default AutoCategory;
