import AutoProduct from "../models/autoProductModel.js";
import Vehicle from "../models/autoVehicleModel.js";

// Fetches vehicles with two modes controlled by the `type` query param:
//
// - "admin": Paginated list for the admin vehicle management table.
//   Supports multi-word search across make, model, and engine fields.
//   Pagination is done via $skip and $limit in the aggregation pipeline.
//   Note: total_pages is computed against ALL vehicles (not just search matches)
//   so it may slightly overestimate pages when a search is active.
//
// - "admin-product-search": Used in the product form's fitment search input.
//   Searches across make, model, engine, start_year, and end_year to help
//   admins find and attach compatible vehicle records to a product.
export const getVehicles = async (req, res) => {
  let { type } = req.query;
  try {
    let vehicles = [];
    switch (type) {
      case "admin":
        let { page } = req.query;
        let limit = 16;
        let totalVehicles = await Vehicle.find().countDocuments();
        // Split search into words; each word must match at least one of make/model/engine
        let search_words = req.query?.search?.split(/\s+/);
        let search_words_query = search_words.map((w) => {
          let or = [
            { make: { $regex: w, $options: "i" } },
            { model: { $regex: w, $options: "i" } },
            { engine: { $regex: w, $options: "i" } },
          ];
          return { $or: or };
        });
        vehicles = await Vehicle.aggregate([
          { $match: { $and: search_words_query } },
          { $sort: { createdAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ]);
        return res.json({
          result: vehicles,
          total_pages: Math.ceil(totalVehicles / limit),
        });
      case "admin-product-search":
        // Searches by any vehicle attribute (including year) to help link fitments in product forms
        let { query } = req.query;
        let words = query.split(/\s+/).filter(Boolean);
        let match_condition = words.map((word) => ({
          $or: [
            { make: { $regex: word, $options: "i" } },
            { model: { $regex: word, $options: "i" } },
            { engine: { $regex: word, $options: "i" } },
            { start_year: word },
            { end_year: word },
          ],
        }));
        vehicles = await Vehicle.aggregate([
          {
            $match: {
              $and: match_condition,
            },
          },
        ]);
        return res.json({ vehicles });

      default:
        break;
    }
  } catch (error) {
    console.log("error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Updates an existing vehicle's fields after validating there is no duplicate entry.
// Checks if another vehicle with the exact same data already exists (excluding the current one).
// This prevents creating duplicate vehicles through an edit operation.
export const updateVehicle = async (req, res) => {
  let { id } = req.params;
  let data = req.body;
  try {
    // Check if any OTHER vehicle already has the same field values
    let match = await Vehicle.find({ ...data, _id: { $ne: id } });
    if (match.length)
      return res.status(400).json({
        message: "Failed: Vehicle already exists within database",
      });
    let update_result = await Vehicle.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    );
    return res.json({ message: "Vehicle Updated" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Creates a new vehicle entry after sanitizing input and checking for exact duplicates.
// All string values are trimmed to prevent whitespace-only duplicates.
// start_year and end_year are converted from strings to integers before saving.
// Returns 409 if an identical vehicle record already exists.
export const createVehicle = async (req, res) => {
  let data = req.body;
  console.log("vehicle data:", data);
  // Trim all string values to avoid whitespace-only duplicates
  data = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value).trim()]),
  );
  try {
    data.start_year = parseInt(data.start_year);
    data.end_year = parseInt(data.end_year);
    // Check for exact duplicate before inserting
    let match = await Vehicle.findOne(data);
    if (match) {
      return res.status(409).json({ message: "Failed: Duplicate Entry" });
    }
    let new_vehicle = await Vehicle.create(data);
    res.json({ message: "Vehicle Added" });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Deletes a vehicle by ID after confirming it is not referenced by any product as a fitment.
// Blocking deletion here keeps product fitment data consistent — avoids dangling references.
export const deleteVehicle = async (req, res) => {
  let { id } = req.params;
  try {
    // Prevent deletion if any product has this vehicle in its fitments array
    const product = await AutoProduct.findOne({ fitments: id }).select("_id");
    console.log("vehicle product:", product);
    if (product)
      return res.status(409).json({
        message: "Failed : Vehicle already referenced by product(s)",
      });
    await Vehicle.deleteOne({ _id: id });
    return res.json({ message: "Vehicle Deleted" });
  } catch (error) {
    console.log("failed to delete vehicle :", error.message);
    return res.status(500).json({ message: error.message });
  }
};
