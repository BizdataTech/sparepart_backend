import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  title: { type: String },
  image: { type: String },
});

const Make = mongoose.model("make", Schema);

export default Make;
