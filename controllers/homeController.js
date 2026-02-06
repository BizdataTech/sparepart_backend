import Logo from "../models/logoModel.js";
import cloudinary from "../utils/cloudinary.js";

export const createLogo = async (req, res) => {
  try {
    let existingLogo = await Logo.findOne();
    if (existingLogo) await cloudinary.uploader.destroy(existingLogo.public_id);

    const result = cloudinary.uploader.upload_stream(
      { folder: "logo" },
      async (error, result) => {
        if (error) throw new Error(error.message);
        let logo_obj = { url: result.secure_url, public_id: result.public_id };
        await Logo.updateOne({}, { $set: logo_obj }, { upsert: true });
        res.json({ message: "logo created" });
      },
    );
    result.end(req.file.buffer);
  } catch (error) {
    console.log("failed to create logo.", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const getLogo = async (req, res) => {
  try {
    let logo = await Logo.findOne({}).select("-public_id -_id");
    return res.json({ logo: logo?.url || null });
  } catch (error) {
    console.log("failed to fetch logo:", error.message);
    return res.json({ message: error.message });
  }
};
