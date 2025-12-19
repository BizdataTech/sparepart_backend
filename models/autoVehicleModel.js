import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  make: { type: String },
  model: { type: String },
  engine: { type: String },
  start_year: { type: Number },
  end_year: { type: Number },
});

const Vehicle = mongoose.model("vehicle", Schema);

export default Vehicle;
