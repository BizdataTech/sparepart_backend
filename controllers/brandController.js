import Brand from "../models/brandModel.js";
import cloudinary from "../utils/cloudinary.js";

// Creates a new brand with a name and logo image.
// Validates that both brand name and an image file are provided.
// Uses Cloudinary's upload_stream with a callback — the brand record is only saved to
// the DB after a successful upload confirmation from Cloudinary.
export const createBrand = async (req, res) => {
  try {
    let { brand_name } = req.body;
    let file = req.file;

    if (!brand_name.trim() || !file) {
      return res.status(400).json({ message: "Brand Name and Image required" });
    }

    // Stream the image buffer to Cloudinary; on success, create the brand document
    const upload_data = await cloudinary.uploader.upload_stream(
      { folder: "brands" },
      async (error, result) => {
        if (error)
          return res.status(500).json({ message: "Brand Failed to Upload" });
        let brand = await Brand.create({
          brand_name,
          image: { url: result.secure_url, public_id: result.public_id },
        });
        return res.json({ message: "Brand Created" });
      },
    );

    upload_data.end(file.buffer);
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Updates a brand's name and/or logo image.
// If a new image file is provided and a public_id exists, the old Cloudinary image is
// deleted before uploading the new one to avoid orphaned files on Cloudinary.
// The public_id field is stripped from the update payload before writing to the DB
// since it is part of the image sub-document, not a top-level field.
export const updateBrand = async (req, res) => {
  try {
    let data = req.body;
    // If replacing the image, delete the old one from Cloudinary first
    if (req.file && data.public_id)
      await cloudinary.uploader.destroy(data.public_id);

    let imageData = {};
    if (req.file) {
      // Upload the new image and get back the url and public_id
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "brands" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );
        stream.end(req.file.buffer);
      });
      imageData = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    let updateData = { ...data };
    // Remove public_id from the top-level update payload (it belongs inside image sub-document)
    delete updateData.public_id;

    if (req.file) updateData.image = imageData;

    await Brand.updateOne({ _id: req.params.id }, { $set: updateData });
    return res.json({ message: "Brand Updated" });
  } catch (error) {
    console.log("Failed to update brand:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Fetches all brands, filtered by a case-insensitive search on brand_name.
// Returns results sorted newest-first. An empty search string returns all brands.
export const getBrands = async (req, res) => {
  try {
    let query = req.query.search.trim();
    let brands = await Brand.find({
      brand_name: { $regex: query, $options: "i" },
    }).sort({ createdAt: -1 });
    return res.json({ result: brands });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Deletes a brand and its associated Cloudinary image.
// First verifies the brand exists before attempting deletion.
// The Cloudinary image is removed using the stored public_id to avoid orphaned assets.
export const deleteBrand = async (req, res) => {
  try {
    let { id } = req.params;
    let brand = await Brand.findOne({ _id: id }).select("image.public_id -_id");
    if (!brand)
      return res
        .status(422)
        .json({ message: "Failed : Couldn't find resourse." });
    // Remove the image from Cloudinary before deleting the DB record
    await cloudinary.uploader.destroy(brand.image.public_id);
    await Brand.deleteOne({ _id: id });
    return res.json({ message: "Brand Deleted" });
  } catch (error) {
    console.log("Failed to delete brand :", error.message);
    return res.status(500).json({ message: error.message });
  }
};
