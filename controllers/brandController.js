import Brand from "../models/brandModel.js";
import cloudinary from "../utils/cloudinary.js";

export const createBrand = async (req, res) => {
  try {
    let { brand_name } = req.body;
    let file = req.file;

    if (!brand_name.trim() || !file) {
      return res.status(400).json({ message: "Brand Name and Image required" });
    }

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

export const updateBrand = async (req, res) => {
  try {
    let data = req.body;
    if (req.file && data.public_id)
      await cloudinary.uploader.destroy(data.public_id);

    let imageData = {};
    if (req.file) {
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
    delete updateData.public_id;

    if (req.file) updateData.image = imageData;

    await Brand.updateOne({ _id: req.params.id }, { $set: updateData });
    return res.json({ message: "Brand Updated" });
  } catch (error) {
    console.log("Failed to update brand:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const getBrands = async (req, res) => {
  try {
    let brands = await Brand.find();
    res.json({ brands });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
