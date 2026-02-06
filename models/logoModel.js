import mongoose from "mongoose";

let Schema = new mongoose.Schema({
  url: { type: String },
  public_id: { type: String },
});

let Logo = mongoose.model("logo", Schema);

export default Logo;
