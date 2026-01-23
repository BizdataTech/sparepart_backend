import mongoose from "mongoose";
import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import getOrderNumber from "../utils/getOrderNumber.js";
import StockReservaton from "../models/reservationModel.js";
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
      orderStatusHistory: [{ status: "placed" }],
      orderNumber,
    });

    await Promise.all(
      cart.items.map((item) => {
        return StockReservaton.create({
          orderId: new_order._id,
          productId: item.productId,
          reservedStock: item.quantity,
        });
      }),
    );

    await Cart.updateOne(
      { userId: req.userId },
      { $set: { items: [], cartTotal: 0 } },
    );
    return res.json({ message: "order placed", orderId: new_order._id });
  } catch (error) {
    console.log("Failed to create order:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const getAllClientOrders = async (req, res) => {
  try {
    let orders = await Order.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          user: "$user.username",
          items: { $size: "$items" },
          totalAmount: 1,
          paymentMethod: 1,
          paymentStatus: 1,
          currentOrderStatus: 1,
          orderNumber: 1,
          createdAt: 1,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    return res.json({ data: orders });
  } catch (error) {
    console.log("failed to get all client orders -", error.message);
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
      { $unwind: "$items" },
      {
        $lookup: {
          from: "autoproducts",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$_id",
          totalAmount: { $first: "$totalAmount" },
          currentOrderStatus: { $first: "$currentOrderStatus" },
          orderNumber: { $first: "$orderNumber" },
          items: {
            $push: {
              product: "$product",
              quantity: "$items.quantity",
            },
          },
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
          totalAmount: 1,
          currentOrderStatus: 1,
          orderNumber: 1,
          "items.quantity": 1,
          "items.product._id": 1,
          "items.product.product_title": 1,
          "items.product.price": 1,
          "items.product.images": 1,
          "items.product.part_number": 1,
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
        $unwind: "$items",
      },
      {
        $lookup: {
          from: "autoproducts",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$_id",
          totalAmount: { $first: "$totalAmount" },
          deliveryAddress: { $first: "$deliveryAddress" },
          paymentMethod: { $first: "$paymentMethod" },
          paymentStatus: { $first: "$paymentStatus" },
          orderStatusHistory: { $first: "$orderStatusHistory" },
          currentOrderStatus: { $first: "$currentOrderStatus" },
          orderNumber: { $first: "$orderNumber" },
          items: {
            $push: {
              product: "$product",
              quantity: "$items.quantity",
            },
          },
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

export const getClientOrderDetails = async (req, res) => {
  try {
    let { id } = req.params;
    let data = await Order.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "autoproducts",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$_id",
          totalAmount: { $first: "$totalAmount" },
          deliveryAddress: { $first: "$deliveryAddress" },
          paymentMethod: { $first: "$paymentMethod" },
          paymentStatus: { $first: "$paymentStatus" },
          orderStatusHistory: { $first: "$orderStatusHistory" },
          currentOrderStatus: { $first: "$currentOrderStatus" },
          orderNumber: { $first: "$orderNumber" },
          items: {
            $push: {
              product: "$product",
              quantity: "$items.quantity",
            },
          },
        },
      },
    ]);
    return res.json({ data: data[0] });
  } catch (error) {
    console.log("fetching orders failed:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// status updates
export const confirmOrder = async (req, res) => {
  try {
    let { id: orderId } = req.params;
    let order = await Order.findById(orderId);
    let reservations = await StockReservaton.find({ orderId });
    if (
      order.currentOrderStatus === "placed" &&
      reservations.every((item) => item.reservedStatus === "active")
    ) {
      await Promise.all(
        reservations.map(async (item) => {
          await AutoProduct.updateOne(
            { _id: item.productId, stock: { $gte: item.reservedStock } },
            { $inc: { stock: -item.reservedStock } },
          );
        }),
      );
      await StockReservaton.deleteMany({ orderId });
      order.currentOrderStatus = "confirmed";
      order.orderStatusHistory.push({ status: "confirmed" });

      await order.save();

      return res.json({ message: "order updated" });
    }
    return res.status(400).json({ message: "Order Confirmation Failed" });
  } catch (error) {
    console.log("failed to update confirm order:", error.message);
    return res.status(500).json({ message: error.message });
  }
};
