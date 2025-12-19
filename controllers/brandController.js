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
          image: result.secure_url,
        });
        return res.json({ message: "New Brand Created", brand });
      }
    );

    upload_data.end(file.buffer);
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
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
