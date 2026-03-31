import mongoose from "mongoose";
import AutoProduct from "../models/autoProductModel.js";
import cloudinary from "../utils/cloudinary.js";
import getFilterQuery from "../utils/getFilterQuery.js";
import StockReservaton from "../models/reservationModel.js";

// Creates a new auto-part product including uploading all provided images to Cloudinary.
// Fitments (compatible vehicle IDs) arrive as a JSON string and are parsed before saving.
// Part number is normalized to uppercase for consistent querying.
// All images are uploaded in parallel using Promise.all with a writable stream approach.
export const createProduct = async (req, res) => {
  try {
    let data = req.body;
    data.part_number = data.part_number.toUpperCase();
    data.fitments = JSON.parse(data.fitments);
    let files = req.files;

    // Upload each file buffer to Cloudinary using upload_stream wrapped in a Promise
    let cloudinary_results = await Promise.all(
      files.map((file) => {
        return new Promise((resolve, reject) => {
          let stream = cloudinary.uploader.upload_stream(
            { folder: "auto_products" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );
          stream.end(file.buffer);
        });
      }),
    );
    // Map Cloudinary results to only keep what we need: url and public_id
    let images = cloudinary_results.map((image) => ({
      url: image.secure_url,
      public_id: image.public_id,
    }));
    console.log("date:", data);
    await AutoProduct.create({ ...data, images });
    res.json({ message: "Success : Product created" });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Updates an existing product's data and manages its image set.
// Handles three image operations in sequence:
//   1. Deletes cancelled images from Cloudinary using their stored public_ids.
//   2. Uploads any new image files to Cloudinary.
//   3. Fetches the product's current images, filters out the cancelled ones,
//      then merges with the newly uploaded ones to form the final image array.
// Fitments are re-parsed from JSON string if provided.
export const updateProduct = async (req, res) => {
  try {
    let { id: productId } = req.params;
    let data = req.body;
    console.log("data:", req.body);

    // Delete cancelled images from cloudinary
    if (data.cancelledIDs) {
      data.cancelledIDs = JSON.parse(data.cancelledIDs || "[]");
      await Promise.all(
        data.cancelledIDs.map((public_id) =>
          cloudinary.uploader.destroy(public_id),
        ),
      );
    }

    // Upload new images to cloudinary
    let newImages = [];
    if (req.files && req.files.length > 0) {
      let cloudinary_results = await Promise.all(
        req.files.map((file) => {
          return new Promise((resolve, reject) => {
            let stream = cloudinary.uploader.upload_stream(
              { folder: "auto_products" },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              },
            );
            stream.end(file.buffer);
          });
        }),
      );
      newImages = cloudinary_results.map((image) => ({
        url: image.secure_url,
        public_id: image.public_id,
      }));
    }

    // Get existing images that weren't cancelled
    let retainedImages = (
      await AutoProduct.findById(productId).select("images -_id")
    ).images.filter(
      (image) => !(data.cancelledIDs || []).includes(image.public_id),
    );

    // Combine retained and new images
    let updatedImages = [...retainedImages, ...newImages];

    // Prepare update data
    let updateData = { ...data };
    delete updateData.cancelledIDs;
    updateData.images = updatedImages;

    // Parse fitments if it's a string
    if (updateData.fitments)
      updateData.fitments = JSON.parse(updateData.fitments);

    // Update the product
    await AutoProduct.findByIdAndUpdate(productId, updateData, { new: true });

    res.json({ message: "Success : Product Updated" });
  } catch (error) {
    console.log("failed to update product:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// A multi-purpose product listing handler controlled by the `filter` query param.
// Each case returns a different shape of product data suited to the context:
//
// - "admin-products": Full admin listing with joined category & brand names,
//    supports multi-word search across product_title and part_number.
//
// - "products": Public listing with optional filtering by category (genuine type)
//    and/or a free-text search query across title, category, and brand.
//
// - "home": Simple category-based listing with brand populated (for homepage sections).
//
// - "search": Broad full-text search across title, brand, category, part number,
//    and fitment make/model (used by global search bar).
//
// - "product-page": Fetches alternative variants of a product by genuine_reference
//    (used on the product detail page to show OEM vs aftermarket options).
//
// - "category": Full category-page query using $facet to simultaneously return:
//    filtered products + aggregated filter options (brands, makes, models, engines).
//    getFilterQuery() builds the dynamic $match from active client-side filters.
export const getProducts = async (req, res) => {
  try {
    let { filter, current_page, category, query } = req.query;
    let products = [];
    switch (filter) {
      case "admin-products":
        let limit = 10;
        console.log(req.query.search);
        // Split search string into individual words for multi-word AND matching
        let search_words = req.query.search.split(/\s+/);
        let search_query = search_words.map((word) => ({
          $or: [
            { product_title: { $regex: word, $options: "i" } },
            { part_number: { $regex: word, $options: "i" } },
          ],
        }));

        // Join category and brand collections to get their names, then filter by search
        let auto_products = await AutoProduct.aggregate([
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
          { $match: { $and: search_query } },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $project: {
              _id: 1,
              product_title: 1,
              "category.title": 1,
              "brand.brand_name": 1,
              product_type: 1,
            },
          },
        ]);

        return res.json({
          result: auto_products,
          total_pages: Math.ceil(auto_products.length / limit),
        });

      case "products":
        let { type } = req.query;
        let match = {};

        // Filter by category and genuine type if specified
        if (type === "genuine") {
          match = {
            "category._id": new mongoose.Types.ObjectId(category),
            product_type: "genuine",
          };
        }

        // Add text search conditions on top of the type filter if a query string is present
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
        // Simple lookup for homepage category sections — populates brand details
        products = await AutoProduct.find({ category: category }).populate(
          "brand",
        );
        return res.json({ products });

      case "search":
        // Global search: split query into words, match each word across multiple fields
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
        // Finds all products sharing the same genuine_reference (OEM/aftermarket alternatives)
        let { genuine_reference } = req.query;
        products = await AutoProduct.aggregate([
          { $match: { genuine_reference } },
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
              product_type: 1,
              image: { $arrayElemAt: ["$images.url", 0] },
              price: 1,
            },
          },
        ]);

        return res.json({ products });
      case "category":
        let { category: slug } = req.query;

        console.log("query:", req.query);

        // getFilterQuery builds a dynamic $match from client-side filter selections (brand, make, model, engine)
        let filter_query = getFilterQuery(req.query);

        // $facet runs multiple sub-pipelines in a single pass:
        // - category_products: products after applying active filters
        // - brands, make, model, engine: aggregated counts for the filter sidebar
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

// Fetches a single product's detail, with behavior controlled by the `filter` query param.
//
// - "genuine": Minimal projection for use in a genuine product card (title, brand, type, first image, price).
//
// - "stock": Returns only the available stock for a product, accounting for active reservations.
//   Available stock = total stock - sum of all active reserved quantities.
//
// - "genuine-update": Lightweight fetch for pre-filling the admin update form for a genuine product.
//
// - default: Full product detail with joined category, brand, and fitments (vehicles).
//   Also computes available_stock by subtracting active reservations from raw stock.
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
              product_title: 1,
              brand: "$brand.brand_name",
              product_type: 1,
              image: { $arrayElemAt: ["$images.url", 0] },
              price: 1,
            },
          },
        ]);
        return res.json({ product });
      case "all-product":
        return;
      case "stock":
        product = await AutoProduct.findById(id).select("stock -_id");
        // Aggregate all active reservation quantities for this product
        let product_reservation_details = await StockReservaton.aggregate([
          {
            $match: {
              productId: new mongoose.Types.ObjectId(id),
              reservedStatus: "active",
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: "$reservedStock" },
            },
          },
        ]);

        // Available stock = total stock minus currently reserved quantity
        let stock =
          product.stock - (product_reservation_details[0]?.count || 0);

        return res.json({ stock });
      case "genuine-update":
        product = (
          await AutoProduct.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            {
              $lookup: {
                from: "brands",
                localField: "brand",
                foreignField: "_id",
                as: "brand",
              },
            },
            {
              $project: {
                product_title: 1,
                "brand.brand_name": 1,
                product_type: 1,
                part_number: 1,
              },
            },
          ])
        )[0];
        return res.json({ product });
      default:
        // Full detail view: join category, brand, and vehicle fitments
        product = await AutoProduct.aggregate([
          { $match: { _id: new mongoose.Types.ObjectId(id) } },
          {
            $lookup: {
              from: "autocategories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          {
            $unwind: "$category",
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
            $lookup: {
              from: "vehicles",
              localField: "fitments",
              foreignField: "_id",
              as: "fitments",
            },
          },
        ]);

        // Compute available stock by subtracting active reservations
        let reserved_stock_details = await StockReservaton.aggregate([
          {
            $match: {
              productId: new mongoose.Types.ObjectId(id),
              reservedStatus: "active",
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: "$reservedStock" },
            },
          },
        ]);

        const available_stock =
          product[0].stock - (reserved_stock_details[0]?.count || 0);

        let product_data = { ...product[0], available_stock };

        res.json({ product: product_data });
        break;
    }
  } catch (error) {
    console.log("product fetching error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Permanently deletes a product from the database after two safety checks:
// 1. Confirms the product actually exists before attempting deletion.
// 2. Blocks deletion if any other product references this one as a genuine_reference,
//    preventing orphaned OEM/aftermarket links.
export const deleteProduct = async (req, res) => {
  try {
    let { id } = req.params;
    let product = await AutoProduct.findById(id);
    if (!product)
      return res.status(400).json({
        message:
          "Deletion Failed : Couldn't find any matching record to delete.",
      });
    // Block deletion if other products are linked to this one via genuine_reference
    const referenced_docs = await AutoProduct.findOne({
      genuine_reference: id,
    });
    if (referenced_docs)
      return res.status(409).json({
        message:
          "Delete Blocked : This genuine product has linked OEM/aftermarket products.",
      });
    await AutoProduct.deleteOne({ _id: id });
    return res.json({ message: "Product Deleted" });
  } catch (error) {
    console.log("failed to delete product:", error.message);
    return res.status(500).json({ message: error.message });
  }
};
