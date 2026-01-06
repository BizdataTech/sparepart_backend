import mongoose from "mongoose";
import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import getOrderNumber from "../utils/getOrderNumber.js";
import AutoProduct from "../models/autoProductModel.js";

export const createOrder = async (req, res) => {
  try {
    let { paymentMethod, addressId } = req.body;
    let cart = await Cart.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
      {
        $project: {
          "items.productId": 1,
          "items.quantity": 1,
          totalAmount: "$cartTotal",
        },
      },
    ]);

    cart = cart[0];
    if (!cart)
      return res
        .status(404)
        .json({ message: "Checkout Failed : Invalid Cart" });

    let deliveryAddress = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.userId) } },
      {
        $addFields: {
          address: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$addresses",
                  as: "ad",
                  cond: {
                    $eq: ["$$ad._id", new mongoose.Types.ObjectId(addressId)],
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $project: {
          address: 1,
        },
      },
      {
        $project: {
          "address._id": 0,
          "address.default": 0,
        },
      },
    ]);

    deliveryAddress = deliveryAddress[0].address;
    console.log("address:", deliveryAddress);

    if (!deliveryAddress)
      return res
        .status(404)
        .json({ message: "Checkout Failed : Address not found" });

    let paymentStatus = "";
    switch (paymentMethod) {
      case "cod":
        paymentStatus = "pending";
        break;
      default:
        paymentStatus = "failed";
        break;
    }
    let orderNumber = await getOrderNumber();

    // create order
    let new_order = await Order.create({
      userId: req.userId,
      items: cart.items,
      totalAmount: cart.totalAmount,
      deliveryAddress,
      paymentMethod,
      paymentStatus,
      orderNumber,
    });

    await Cart.updateOne(
      { userId: req.userId },
      { $set: { items: [], cartTotal: 0 } }
    );
    return res.json({ message: "order placed", orderId: new_order._id });
  } catch (error) {
    console.log("Failed to create order:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    let orders = await Order.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.userId),
        },
      },
      {
        $lookup: {
          from: "autoproducts",
          localField: "items.productId",
          foreignField: "_id",
          as: "products",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $project: {
          _id: 1,
          orderStatus: 1,
          orderNumber: 1,
          totalAmount: 1,
          "products._id": 1,
          "products.product_title": 1,
          "products.price": 1,
          "products.images": 1,
          "products.part_number": 1,
        },
      },
    ]);
    return res.json({ orders });
  } catch (error) {
    console.log("failed to fetch orders:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const getOrderData = async (req, res) => {
  try {
    let { id } = req.params;
    let data = await Order.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(req.userId),
        },
      },
      {
        $lookup: {
          from: "autoproducts",
          localField: "items.productId",
          foreignField: "_id",
          as: "products",
        },
      },
      {
        $project: {
          userId: 0,
        },
      },
    ]);
    if (data.paymentStatus === "failed")
      return res.json({ ...data, success: false, message: "Payment Failed" });
    return res.json({ data: data[0] });
  } catch (error) {
    console.log("failed to fetch the order data:", error.message);
    return res.status(500).json({ message: error.message });
  }
};
