import mongoose from "mongoose";
import AutoProduct from "../models/autoProductModel.js";
import cloudinary from "../utils/cloudinary.js";
import getFilterQuery from "../utils/getFilterQuery.js";

export const createProduct = async (req, res) => {
  try {
    let data = req.body;
    data.part_number = data.part_number.toUpperCase();
    data.fitments = JSON.parse(data.fitments);
    let files = req.files;

    let cloudinary_results = await Promise.all(
      files.map((file) => {
        return new Promise((resolve, reject) => {
          let stream = cloudinary.uploader.upload_stream(
            { folder: "auto_products" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(file.buffer);
        });
      })
    );
    let images = cloudinary_results.map((image) => image.secure_url);
    console.log("date:", data);
    await AutoProduct.create({ ...data, images });
    res.json({ message: "product created" });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    let { filter, current_page, category, query } = req.query;
    let products = [];
    switch (filter) {
      case "admin-products":
        let limit = 10;
        let total_products = await AutoProduct.find().countDocuments();
        products = await AutoProduct.find()
          .populate("brand")
          .populate("category");
        return res.json({
          products,
          total_pages: Math.ceil(total_products / limit),
        });
      case "products":
        let { type } = req.query;
        let match = {};

        if (type === "genuine") {
          match = {
            "category._id": new mongoose.Types.ObjectId(category),
            product_type: "genuine",
          };
        }

        if (query) {
          let query_words = query.split(/\s+/).filter(Boolean);
          let query_condition = query_words.map((word) => ({
            $or: [
              { product_title: { $regex: word, $options: "i" } },
              { "category.title": { $regex: word, $options: "i" } },
              { "brand.brand_name": { $regex: word, $options: "i" } },
            ],
          }));
          match = { ...match, $and: query_condition };
        }

        products = await AutoProduct.aggregate([
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
            $lookup: {
              from: "autocategories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          { $unwind: "$category" },
          { $match: match },
          {
            $project: {
              _id: 1,
              product_title: 1,
              product_type: 1,
              "brand.brand_name": 1,
              "brand.image": 1,
              part_number: 1,
              price: 1,
              stock: 1,
            },
          },
        ]);
        console.log("genuine produts:", products);
        return res.json({ products });

      case "home":
        products = await AutoProduct.find({ category: category }).populate(
          "brand"
        );
        return res.json({ products });

      case "search":
        let words = query.split(/\s+/).filter(Boolean);
        let search_condition = words.map((w) => ({
          $or: [
            { product_title: { $regex: w, $options: "i" } },
            { "brand.brand_name": { $regex: w, $options: "i" } },
            { "category.title": { $regex: w, $options: "i" } },
            { part_number: { $regex: w, $options: "i" } },
            { "fitments.make": { $regex: w, $options: "i" } },
            { "fitments.model": { $regex: w, $options: "i" } },
          ],
        }));
        products = await AutoProduct.aggregate([
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
            $lookup: {
              from: "vehicles",
              localField: "fitments",
              foreignField: "_id",
              as: "fitments",
            },
          },
          { $match: { $and: search_condition } },
          {
            $project: {
              product_title: 1,
              _id: 1,
              brand: "$brand.brand_name",
            },
          },
        ]);
        return res.json({ products });
      case "product-page":
        let { genuine_reference } = req.query;
        products = await AutoProduct.find({ genuine_reference });
        return res.json({ products });
      case "category":
        let { category: slug } = req.query;

        console.log("query:", req.query);

        let filter_query = getFilterQuery(req.query);

        products = await AutoProduct.aggregate([
          {
            $lookup: {
              from: "autocategories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          { $unwind: "$category" },
          { $match: { "category.slug": slug } },
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
            $lookup: {
              from: "vehicles",
              localField: "fitments",
              foreignField: "_id",
              as: "fitments",
            },
          },
          {
            $facet: {
              category_products: [
                { $match: filter_query },
                {
                  $project: {
                    product_title: 1,
                    "brand.brand_name": 1,
                    product_type: 1,
                    price: 1,
                    images: 1,
                  },
                },
              ],
              brands: [
                {
                  $group: {
                    _id: "$brand.brand_name",
                    count: { $sum: 1 },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    title: "$_id",
                    count: 1,
                  },
                },
                { $sort: { title: 1 } },
              ],
              make: [
                { $unwind: "$fitments" },
                {
                  $group: {
                    _id: "$fitments.make",
                    count: { $sum: 1 },
                  },
                },
                {
                  $project: {
                    title: "$_id",
                    count: 1,
                    _id: 0,
                  },
                },
                { $sort: { title: 1 } },
              ],
              model: [
                { $unwind: "$fitments" },
                {
                  $group: {
                    _id: "$fitments.model",
                    count: { $sum: 1 },
                  },
                },
                {
                  $project: {
                    title: "$_id",
                    count: 1,
                    _id: 0,
                  },
                },
                { $sort: { title: 1 } },
              ],
              engine: [
                { $unwind: "$fitments" },
                {
                  $group: {
                    _id: "$fitments.engine",
                    count: { $sum: 1 },
                  },
                },
                {
                  $project: {
                    title: "$_id",
                    count: 1,
                    _id: 0,
                  },
                },
                { $sort: { title: 1 } },
              ],
            },
          },
        ]);
        let { category_products, brands, make, model, engine } = products[0];
        return res.json({
          category_products,
          filters: { brands, make, model, engine },
        });
      default:
        break;
    }
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getProduct = async (req, res) => {
  try {
    let { id } = req.params;
    let { filter } = req.query;
    let product = null;
    switch (filter) {
      case "genuine":
        product = await AutoProduct.aggregate([
          { $match: { _id: new mongoose.Types.ObjectId(id) } },
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
            $project: {
              _id: 1,
              images: 1,
              product_title: 1,
              product_type: 1,
              "brand.brand_name": 1,
            },
          },
        ]);
        return res.json({ product });
      case "all-product":
        return;
      case "stock":
        let product_stock = await AutoProduct.findById(req.params.id).select(
          "stock -_id"
        );
        return res.json({ product_stock });
      default:
        product = await AutoProduct.findOne({ _id: id })
          .populate("brand")
          .populate("category");
        res.json({ product });
        break;
    }
  } catch (error) {
    console.log("product fetching error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
