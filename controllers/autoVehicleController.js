import AutoProduct from "../models/autoProductModel.js";
import Vehicle from "../models/autoVehicleModel.js";

export const getVehicles = async (req, res) => {
  let { type } = req.query;
  try {
    let vehicles = [];
    switch (type) {
      case "admin":
        let { page } = req.query;
        let limit = 16;
        let totalVehicles = await Vehicle.find().countDocuments();
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

export const updateVehicle = async (req, res) => {
  let { id } = req.params;
  let data = req.body;
  try {
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

export const createVehicle = async (req, res) => {
  let data = req.body;
  console.log("vehicle data:", data);
  data = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value).trim()]),
  );
  try {
    data.start_year = parseInt(data.start_year);
    data.end_year = parseInt(data.end_year);
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

export const deleteVehicle = async (req, res) => {
  let { id } = req.params;
  try {
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
