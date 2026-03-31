import Logo from "../models/logoModel.js";
import { Section } from "../models/sectionModel.js";

// Returns the site logo for the client-facing frontend.
// Strips internal fields (_id, public_id, __v) since the client only needs the URL.
export const getClientLogo = async (req, res) => {
  try {
    let logo = await Logo.findOne().select("-_id -public_id -__v");
    return res.json(logo);
  } catch (error) {
    console.log("failed to fetch logo.", error.message);
  }
};

// Returns all homepage sections for the client-facing frontend.
// Excludes timestamp and internal fields to keep the response lean.
// Sections include banners, product listings, etc., and are used to
// dynamically build the homepage layout.
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
