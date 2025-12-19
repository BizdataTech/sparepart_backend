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
        vehicles = await Vehicle.find()
          .skip((page - 1) * limit)
          .limit(limit);
        return res.json({
          vehicles,
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
      { new: true }
    );
    console.log("update result:", update_result);
    return res.json({ vehicle: update_result });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createVehicle = async (req, res) => {
  let data = req.body;
  data = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value.trim()])
  );
  try {
    data.start_year = parseInt(data.start_year);
    data.end_year = parseInt(data.end_year);
    let match = await Vehicle.find(data);
    if (match.length) {
      return res
        .status(400)
        .json({ message: "Failed: Vehicle already exists within database" });
    }
    let new_vehicle = await Vehicle.create(data);
    res.json({ vehicle: new_vehicle });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
