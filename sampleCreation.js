import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const Schema = new mongoose.Schema({
  title: String,
  images: [String],
});

const Sample = mongoose.model("sample", Schema);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
  } catch (error) {
    console.log("error:", error.message);
  }
};

const createSampleProducts = async () => {
  try {
    await connectDB();
    const imageFolder = path.join("sample_images");
    const allFiles = fs.readdirSync(imageFolder);
    const fileSize = allFiles.length;
    const batchSize = 4000;

    for (let i = 0; i < fileSize; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize).map((file, idx) => ({
        title: `Sample image for database data retrieval${idx + 1}`,
        images: [`/sample_images/${file}`],
      }));
      await Sample.insertMany(batch, { ordered: false });
    }
    await mongoose.disconnect();
    console.log("images added");
  } catch (error) {
    console.log("error:", error.message);
  }
};

const getDocCount = async () => {
  await connectDB();
  const count = await Sample.countDocuments();
  console.log("total docs:", count);
  await mongoose.disconnect();
};

// createSampleProducts();
// getDocCount()

export default Sample;
