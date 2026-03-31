import Logo from "../models/logoModel.js";
import cloudinary from "../utils/cloudinary.js";

// Uploads or replaces the site logo image.
// If a logo already exists in the DB, its Cloudinary asset is deleted first to avoid
// orphaned files. The new image is then streamed to Cloudinary, and the DB record
// is upserted (updated if exists, created if not) with the new url and public_id.
export const createLogo = async (req, res) => {
  try {
    let existingLogo = await Logo.findOne();
    console.log("existing logo:", existingLogo);
    // Delete the old logo from Cloudinary before uploading the replacement
    if (existingLogo) await cloudinary.uploader.destroy(existingLogo.public_id);

    // Stream the image buffer to Cloudinary; on callback success, upsert the Logo record
    const result = cloudinary.uploader.upload_stream(
      { folder: "logo" },
      async (error, result) => {
        if (error) throw new Error(error.message);
        let logo_obj = { url: result.secure_url, public_id: result.public_id };
        // upsert: true ensures a new document is created if none exists yet
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

// Returns the site logo URL for the admin panel.
// Returns null if no logo has been uploaded yet, so the frontend
// can show a placeholder instead.
export const getLogo = async (req, res) => {
  try {
    let logo = await Logo.findOne({}).select("-public_id -_id");
    return res.json({ logo: logo?.url || null });
  } catch (error) {
    console.log("failed to fetch logo:", error.message);
    return res.json({ message: error.message });
  }
};
