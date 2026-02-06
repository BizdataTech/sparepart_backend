import Logo from "../models/logoModel.js";
import { Section } from "../models/sectionModel.js";

export const getClientLogo = async (req, res) => {
  try {
    let logo = await Logo.findOne().select("-_id -public_id -__v");
    return res.json(logo);
  } catch (error) {
    console.log("failed to fetch logo.", error.message);
  }
};

export const getSections = async (req, res) => {
  try {
    let sections = await Section.find().select(
      "-createdAt -updatedAt -_id -__v",
    );
    return res.json({ sections });
  } catch (error) {
    console.log("failed to fetch sections (client) :", error.message);
    return res.status(500).json({ message: error.message });
  }
};
