import OrderCountModel from "../models/orderCountModel.js";

let getOrderNumber = async () => {
  let daycode = new Date().toISOString().split("T")[0].replace(/-/g, "");
  let newCountObject = await OrderCountModel.findOneAndUpdate(
    { label: daycode },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );

  return `ORD-${daycode}-${String(newCountObject.count).padStart(5, "0")}`;
};
export default getOrderNumber;
