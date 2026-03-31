import mongoose from "mongoose";
import AutoCategory from "../models/autoCategoryModel.js";
import AutoProduct from "../models/autoProductModel.js";
import { Banner, ProductListing, Section } from "../models/sectionModel.js";
import cloudinary from "../utils/cloudinary.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";

// Returns all homepage section documents (banners and product listings) for the admin panel.
// Used to render the section management list.
export const getSections = async (req, res) => {
  try {
    let sections = await Section.find();
    return res.json({ sections });
  } catch (error) {
    console.log("failed to fetch sections:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Resolves the live data for a specific section type, used before rendering
// a section on the homepage. Behavior depends on `req.params.section_type`:
//
// - "banner": Returns a frontend route string (/category/slug or /product/id)
//   that the banner should link to, resolved from the reference_id and data_source.
//
// - "product_listing": Returns actual product documents for a category-based
//   product listing section, limited by the `limit` query param.
//   Products are joined with brand data and projected for card display.
export const getSectionData = async (req, res) => {
  try {
    let result = [];
    let { reference_id, data_source, limit } = req.query;
    switch (req.params.section_type) {
      case "banner":
        // Resolve the banner's click destination based on what it references
        if (data_source === "category") {
          let category_match = await AutoCategory.findOne({
            _id: reference_id,
          }).select("slug -_id");
          result = `/category/${category_match.slug}`;
        } else if (data_source === "product") {
          let product_match = await AutoProduct.findOne({
            _id: reference_id,
          }).select("_id");
          result = `/product/${product_match._id}`;
        }
        break;
      case "product_listing":
        if (data_source === "category") {
          // Fetch products from the referenced category, join brand, and project card fields
          result = await AutoProduct.aggregate([
            {
              $match: {
                category: new mongoose.Types.ObjectId(reference_id),
              },
            },
            {
              $lookup: {
                from: "brands",
                localField: "brand",
                foreignField: "_id",
                as: "brand",
              },
            },
            {
              $unwind: "$brand",
            },
            {
              $limit: Number(limit),
            },
            {
              $project: {
                product_title: 1,
                brand: "$brand.brand_name",
                product_type: 1,
                image: { $arrayElemAt: ["$images.url", 0] },
                price: 1,
              },
            },
          ]);
        }
        break;
      default:
        break;
    }

    return res.json({ result });
  } catch (error) {
    console.log("failed to fetch section specific data:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Resolves the human-readable label for a section's reference (product or category),
// used in the admin panel to display what a section is pointing to.
// For a product reference: returns product_title and brand name.
// For a category reference: returns the category title.
export const getSectionReference = async (req, res) => {
  try {
    console.log("hey");
    let { reference_id } = req.params;
    let { data_source } = req.query;
    let result;
    switch (data_source) {
      case "product":
        result = (
          await AutoProduct.aggregate([
            {
              $match: {
                _id: new mongoose.Types.ObjectId(reference_id),
              },
            },
            {
              $lookup: {
                from: "brands",
                localField: "brand",
                foreignField: "_id",
                as: "brand",
              },
            },
            {
              $unwind: "$brand",
            },
            {
              $project: {
                product_title: 1,
                brand: "$brand.brand_name",
                _id: 0,
              },
            },
          ])
        )[0];
        break;
      case "category":
        result = await AutoCategory.findById(reference_id).select("title -_id");
        break;
      default:
        break;
    }
    return res.json(result);
  } catch (error) {
    console.log("Failed to fetch section reference:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Creates a new homepage section. The section_type in req.body determines which
// discriminator model is used (Banner or ProductListing).
//
// - "banner": Requires an image file. Uploads it to Cloudinary and stores
//   the url and public_id alongside the section data.
//
// - "product_listing": Converts the form string "yes"/"no" for redirection to a boolean
//   and renames `count` to `limit` before saving.
export const createSection = async (req, res) => {
  try {
    const data = req.body;
    switch (data.section_type) {
      case "banner":
        if (!req.file)
          return res
            .status(400)
            .json({ message: "Section creation failed : File missing" });

        // Wrap cloudinary stream in a Promise so we can await it
        const uploadToCloudinary = (file) => {
          return new Promise((resolve, reject) => {
            let stream = cloudinary.uploader.upload_stream(
              { folder: "banner_images" },
              (error, result) => {
                if (error) return reject(error);
                resolve({
                  secure_url: result.secure_url,
                  public_id: result.public_id,
                });
              },
            );
            stream.end(file.buffer);
          });
        };

        let { secure_url, public_id } = await uploadToCloudinary(req.file);
        await Banner.create({
          ...data,
          secure_url,
          public_id,
        });
        break;
      case "product_listing":
        console.log("product listing values:", data);
        // Rename `count` to `limit` to match the schema field name
        data.limit = Number(data.count);
        delete data.count;
        // Convert the string redirection flag to a proper boolean
        data.redirection = data.redirection === "yes" ? true : false;
        await ProductListing.create(data);
        break;
      default:
        break;
    }

    return res.json({ message: "Section Created" });
  } catch (error) {
    console.log("failed section creation:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Updates an existing section by ID.
// Reads the section_type to determine which model (Banner or ProductListing) to update.
//
// - "banner": If a new image file is provided, the old Cloudinary image is deleted first,
//   then the new image is uploaded and its url/public_id is injected into req.body before saving.
//
// - "product_listing": Updates with whatever fields are sent in req.body.
export const updateSection = async (req, res) => {
  try {
    const section = await Section.findOne({ _id: req.params.id })
      .select("public_id section_type")
      .lean();
    if (!section)
      return res
        .status(400)
        .json({ message: "Updation failed : Invalid section provided" });

    // Select the correct discriminator model based on section_type
    let Model = section.section_type === "banner" ? Banner : ProductListing;

    switch (section.section_type) {
      case "banner":
        if (req.file) {
          // Delete old image from Cloudinary before uploading the replacement
          await cloudinary.uploader.destroy(section.public_id);
          let { secure_url, public_id } = await uploadToCloudinary(
            req.file.buffer,
            "banner_images",
          );
          // Inject new image fields into the update payload
          req.body.secure_url = secure_url;
          req.body.public_id = public_id;
        }
        let result = await Model.updateOne(
          { _id: req.params.id },
          { $set: req.body },
          { runValidators: true },
        );
        return res.json({ message: "Section Updated" });
      case "product_listing":
        console.log("update data:", req.body);
        let data = req.body;
        await Model.updateOne(
          { _id: req.params.id },
          { $set: req.body },
          { runValidators: true },
        );
        return res.json({ message: "Section Updated" });
    }
  } catch (error) {
    console.log("failed to update section:", error);
    return res
      .status(500)
      .json({ message: `Updation failed : ${error.message}` });
  }
};

// Deletes a section by ID using the appropriate discriminator model.
// First verifies the section exists, then delegates deletion to Banner or ProductListing
// based on section_type to ensure discriminator-level hooks run properly.
export const deleteSection = async (req, res) => {
  let { id } = req.params;
  try {
    const section = await Section.findOne({ _id: id }).select("section_type");
    if (!section)
      return res.status(400).return({
        message: "Deletion Dismissed : Requested section could not found",
      });

    switch (section.section_type) {
      case "banner":
        await Banner.deleteOne({ _id: id });
        break;
      case "product_listing":
        await ProductListing.deleteOne({ _id: id });
        break;
      default:
        break;
    }

    return res.json({ message: "Section Deleted" });
  } catch (error) {
    console.log("failed to delete section:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Handles dynamic search within the admin section reference picker.
// Used when an admin selects a product or category to attach to a section.
//
// - "product": Searches by title, category name, brand name, and part number.
//   Returns the first image alongside basic product info for the selection list.
//
// - "category": Case-insensitive title search, returns title and slug.
export const getSearch = async (req, res) => {
  try {
    const { data_source } = req.params;
    let result = [];
    switch (data_source) {
      case "product":
        // Multi-word search across product identifiers and relationships
        let product_query_condition = req.query.query
          .split(/\s+/)
          .map((word) => ({
            $or: [
              { product_title: { $regex: word, $options: "i" } },
              { "category.title": { $regex: word, $options: "i" } },
              { "brand.brand_name": { $regex: word, $options: "i" } },
              { part_number: { $regex: word, $options: "i" } },
            ],
          }));
        result = await AutoProduct.aggregate([
          {
            $lookup: {
              from: "autocategories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          { $unwind: "$category" },
          {
            $lookup: {
              from: "brands",
              localField: "brand",
              foreignField: "_id",
              as: "brand",
            },
          },
          { $unwind: "$brand" },
          {
            $match: {
              $and: product_query_condition,
            },
          },
          {
            // Promote the first image to a top-level field for easy rendering
            $addFields: {
              image: { $arrayElemAt: ["$images", 0] },
            },
          },
          {
            $project: {
              product_title: 1,
              category: "$category.title",
              brand: "$brand.brand_name",
              part_number: 1,
              image: 1,
            },
          },
        ]);
        break;
      case "category":
        console.log("hey");
        result = await AutoCategory.aggregate([
          {
            $match: {
              title: { $regex: req.query.query, $options: "i" },
            },
          },
          {
            $project: { title: 1, slug: 1 },
          },
        ]);

        break;
      default:
        break;
    }
    return res.json({ result });
  } catch (error) {
    console.log("failed to query search results:", error.message);
    return res.status(500).json({ message: error.message });
  }
};
