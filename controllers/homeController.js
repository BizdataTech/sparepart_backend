import Logo from "../models/logoModel.js";
import cloudinary from "../utils/cloudinary.js";

export const createLogo = async (req, res) => {
  try {
    const result = cloudinary.uploader.upload_stream(
      { folder: "logo" },
      async (error, result) => {
        if (error) throw error;
        let url = result.secure_url;
        await Logo.updateOne({}, { $set: { logo: url } }, { upsert: true });
        res.json({ message: "logo created" });
      },
    );
    result.end(req.file.buffer);
  } catch (error) {
    console.log("failed to create logo.", error.message);
    return res.status(500).json({ message: error.message });
  }
};
