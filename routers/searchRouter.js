import express from "express";
import { Product } from "../models/productModel.js";
const router = express.Router();

router.get("/search/suggestions", async (req, res) => {
  let { query, limit } = req.query;
  try {
    if (!query || query.trim().length < 2) {
      return res.json({ result: [] });
    }
    limit = parseInt(limit);
    let pipeline = [
      {
        $search: {
          index: "product_search", // create this index on Atlas
          text: {
            query: query.trim(),
            path: [
              "product_title",
              "description",
              "brand",
              "sections.details.value",
            ],
            // fuzzy: { maxEdits: 1, prefixLength: 1 },
          },
        },
      },
      {
        $project: {
          product_title: 1,
          brand: 1,
          score: { $meta: "searchScore" },
        },
      },
      { $sort: { score: -1 } },
      { $limit: limit },
    ];

    let result = [];
    try {
      result = await Produc.aggregate(pipeline);
    } catch (error) {
      console.warn(
        "Atlas search failed, falling back to regex:",
        error.message
      );

      const terms = query.split(/\s+/).filter(Boolean); // ["Samsung", "Washing", "machine", "1400rpm"]

      const searchConditions = terms.map((word) => ({
        $or: [
          { product_title: { $regex: word, $options: "i" } },
          { brand: { $regex: word, $options: "i" } },
          { "sections.details.value": { $regex: word, $options: "i" } },
        ],
      }));

      result = await Product.aggregate([
        { $match: { $and: searchConditions } },
        { $project: { product_title: 1, brand: 1 } },
        { $limit: limit },
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
        {
          $addFields: {
            thumbnail: { $arrayElemAt: ["$variant.images", 0] },
          },
        },
      ]);
    }
    res.json({ result });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
