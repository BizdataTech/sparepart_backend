import ProductSection from "../models/productSections.js";

export const createProductSection = async (req, res) => {
  try {
    console.log("data:", req.body);
    let new_section = await ProductSection.create(req.body);
    res.json({ message: "product data section created", section: new_section });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getProductSectionData = async (req, res) => {
  try {
    let sections = await ProductSection.find();
    res.json({ sections });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
