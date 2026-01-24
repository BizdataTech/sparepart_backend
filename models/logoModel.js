import mongoose from "mongoose";

let Schema = new mongoose.Schema({
  logo: { type: String },
});

let Logo = mongoose.model("logo", Schema);

export default Logo;
