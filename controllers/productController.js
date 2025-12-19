import { Parent, Variant, Product } from "../models/productModel.js";
import Category from "../models/categoryModel.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import mongoose from "mongoose";

export const validateSKU = async (req, res) => {
  console.log("req.body:", req.body);
  let { skuArray } = req.body;
  let matchingSKUs = (await Variant.find({ sku: { $in: skuArray } })).map(
    (variant) => variant.sku
  );
  console.log("matching skus:", matchingSKUs);
  if (matchingSKUs.length) {
    return res
      .status(409)
      .json({ message: "Some SKUs are already created.", SKUs: matchingSKUs });
  }
  return res.status(200).json({ message: "Variants can be created" });
};

export const createProduct = async (req, res) => {
  let data = JSON.parse(req.body.data);
  try {
    for (let file of req.files) {
      let match = file.fieldname.match(/variant\[(\d+)\]\[images\]/);
      if (!match) continue;

      let variantIndex = parseInt(match[1], 10); //parsing string number to base 10 number
      let uploadResult = await uploadToCloudinary(file.buffer, "products");
      if (!data.variants[variantIndex].images) {
        data.variants[variantIndex].images = [];
      }
      data.variants[variantIndex].images.push(uploadResult.secure_url);
    }
    console.log("products data images", data.variants[0].images);

    let { sections, general_data, variants, category } = data;

    // data structuring
    let new_sections = Object.values(
      Object.values(sections).reduce((object, section) => {
        if (!object[section.section]) {
          object[section.section] = {
            title: section.section,
            details: [{ label: section.label, value: section.value }],
          };
        } else
          object[section.section].details.push({
            label: section.label,
            value: section.value,
          });
        return object;
      }, {})
    );

    // structuring parent data
    let parent_data = {
      product_type: "parent",
      product_title: general_data.product_title,
      brand: general_data.brand,
      description: general_data.description,
      category,
      sections: new_sections,
    };

    // create parent product;
    let parent_product = await Parent.create(parent_data);
    let getVariantData = (variant) => {
      return {
        parentId: parent_product._id,
        sku: variant.sku,
        price: variant.price,
        stock: variant.stock,
        images: variant.images,
        variant_details: variant.attributes,
      };
    };

    // creating variant products
    let variantsArray = variants.map((variant) => getVariantData(variant));
    console.log("variant_array:", variantsArray);
    await Variant.insertMany(variantsArray);
    await Category.updateOne(
      { _id: category },
      { $inc: { categoryProductCount: 1 } }
    );
    res.status(200).json({ message: "success" });
  } catch (error) {
    console.log("error:", error.message);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Duplicate SKU or Unique Field" });
    }
    return res.status(500).json({ message: error.message });
  }

  // structuring sections
};

export const getProducts = async (req, res) => {
  let { filter, current_page, category } = req.query;
  let products = [];
  try {
    switch (filter) {
      case "admin-products":
        let limit = 10;
        let pipeline = [
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "parentId",
              as: "variants",
            },
          },
          {
            $addFields: { total_variants: { $size: "$variants" } },
          },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          {
            $unwind: "$category",
          },
          {
            $project: {
              product_title: 1,
              category: "$category.title",
              brand: 1,
              total_variants: 1,
            },
          },
          { $skip: limit * (Number(current_page) - 1) },
          { $limit: limit },
        ];
        let total = await Parent.find().countDocuments();
        products = await Parent.aggregate(pipeline);
        return res.status(200).json({
          message: "success",
          products,
          total_pages: Math.ceil(total / limit),
        });
      case "home":
        let pipeline_2 = [
          {
            $match: { category: new mongoose.Types.ObjectId(category) },
          },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "parentId",
              as: "variants",
            },
          },
          {
            $addFields: {
              variant: { $arrayElemAt: ["$variants", 0] },
            },
          },
          {
            $project: {
              variants: 0,
              product_type: 0,
              description: 0,
              category: 0,
              sections: 0,
              "variant.product_type": 0,
              "variant.sku": 0,
              "variant.variant_details": 0,
              "variant.parentId": 0,
            },
          },
        ];
        products = await Parent.aggregate(pipeline_2);
        // console.log("result:", result);
        break;
      case "product-list":
        let aggregationPipeline = [
          { $match: { category: new mongoose.Types.ObjectId(category) } },
          { $project: { description: 0, sections: 0 } },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "parentId",
              as: "variants",
            },
          },
          { $addFields: { variant: { $arrayElemAt: ["$variants", 0] } } },
          { $project: { variants: 0 } },
        ];
        products = await Product.aggregate(aggregationPipeline);
        break;
      case "search":
        let { query } = req.query;
        console.log("query:", query);
        // Split the query into separate terms
        const terms = query.split(/\s+/).filter(Boolean);

        // Build $and conditions for each term
        const searchConditions = terms.map((word) => ({
          $or: [
            { product_title: { $regex: word, $options: "i" } },
            { description: { $regex: word, $options: "i" } },
            { brand: { $regex: word, $options: "i" } },
            { "sections.details.value": { $regex: word, $options: "i" } },
          ],
        }));

        // Aggregation pipeline
        products = await Product.aggregate([
          {
            $match: {
              $and: searchConditions, // all words must appear somewhere
            },
          },
          { $project: { category: 0, sections: 0 } },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "parentId",
              as: "variants",
            },
          },
          { $addFields: { variant: { $arrayElemAt: ["$variants", 0] } } },
          {
            $project: {
              variants: 0,
            },
          },
        ]);

        console.log("search result hey:", products);
        break;

      default:
        break;
    }
    res.status(200).json({ message: "success", products });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// get single product data;
export const getProduct = async (req, res) => {
  let { id } = req.params;
  let { parent, filter } = req.query;
  let pipeline = [];

  switch (filter) {
    case "variant":
      pipeline = [
        { $match: { parentId: new mongoose.Types.ObjectId(parent) } },
      ];
      break;
    case "stock":
      pipeline = [{ $match: { _id: new mongoose.Types.ObjectId(id) } }];
    default:
      pipeline = [
        {
          $match: { _id: new mongoose.Types.ObjectId(id) },
        },
        {
          $lookup: {
            from: "products",
            localField: "parentId",
            foreignField: "_id",
            as: "parent",
          },
        },
        { $unwind: "$parent" },
      ];
      break;
  }

  try {
    let products = await Product.aggregate(pipeline);
    res.status(200).json({ products });
  } catch (error) {
    console.log("single product fetching error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const deleteProducts = async (req, res) => {
  try {
    await Product.deleteMany({});
    res.status(200).json({ message: "products successfully deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
