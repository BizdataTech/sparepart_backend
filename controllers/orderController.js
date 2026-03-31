import mongoose from "mongoose";
import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import getOrderNumber from "../utils/getOrderNumber.js";
import StockReservaton from "../models/reservationModel.js";
import AutoProduct from "../models/autoProductModel.js";
import { sendEmail } from "../utils/sendEmail.js";
import { buildOrderNotificationEmail } from "../templates/orderNotification.js";

// Places a new order from the user's current cart.
// Steps performed in sequence:
//   1. Fetch the user's cart (items + total) using aggregation.
//   2. Resolve the delivery address by filtering the user's address array by the sent addressId.
//   3. Set paymentStatus based on paymentMethod (COD = "pending", others = "failed").
//   4. Generate a unique human-readable orderNumber.
//   5. Create the Order document with an initial status of "placed".
//   6. Fire-and-forget: send an admin notification email with order details (non-blocking).
//   7. Create StockReservation records for each item — these hold stock aside
//      until the admin confirms the order.
//   8. Clear the user's cart after successful order creation.
export const createOrder = async (req, res) => {
  try {
    let { paymentMethod, addressId } = req.body;

    // Fetch only the fields needed from the cart to build the order
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

    // Extract the specific address the user selected for delivery from their address array
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
        // Strip _id and default flag from the embedded address before saving to order
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

    // Determine payment status based on method (currently only COD is supported)
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

    // Create the order document with initial status "placed"
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

    // Fire-and-forget: fetch customer and product details, build and send the admin notification email.
    // This runs asynchronously without blocking the response to the user.
    (async () => {
      try {
        const [customer, products] = await Promise.all([
          User.findById(req.userId).select("username email").lean(),
          AutoProduct.find({
            _id: { $in: cart.items.map((i) => i.productId) },
          })
            .select("product_title part_number price")
            .lean(),
        ]);

        // Build a lookup map: productId string → product object for fast access in the template
        const productMap = {};
        products.forEach((p) => {
          productMap[p._id.toString()] = p;
        });

        const html = buildOrderNotificationEmail({
          order: new_order,
          customer,
          cartItems: cart.items,
          productMap,
        });

        await sendEmail({
          to: "muhammedbinramli@gmail.com",
          subject: `New Order #${new_order.orderNumber} — ₹${new_order.totalAmount.toFixed(2)}`,
          html,
        });
      } catch (emailErr) {
        console.error("Admin order email failed:", emailErr.message);
      }
    })();

    // Reserve stock for each ordered item to prevent overselling before admin confirms
    await Promise.all(
      cart.items.map((item) => {
        return StockReservaton.create({
          orderId: new_order._id,
          productId: item.productId,
          reservedStock: item.quantity,
        });
      }),
    );

    // Clear the cart after the order is successfully placed
    await Cart.updateOne(
      { userId: req.userId },
      { $set: { items: [], cartTotal: 0 } },
    );

    return res.json({
      message: "Order Placed",
      orderId: new_order._id,
      data: new_order,
    });
  } catch (error) {
    console.log("Failed to create order:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Returns all orders for the admin order management table.
// Supports multi-word search across orderNumber and the recipient's name in deliveryAddress.
// Each result includes item count (not the actual items), totals, and current status,
// sorted newest-first.
export const getAllClientOrders = async (req, res) => {
  try {
    let search_words = req.query.search.split(/\s+/);
    // Each word must match either the order number or the customer name
    let query = search_words.map((w) => ({
      $or: [
        { orderNumber: { $regex: w, $options: "i" } },
        { "deliveryAddress.name": { $regex: w, $options: "i" } },
      ],
    }));
    let orders = await Order.aggregate([
      {
        $match: {
          $and: query,
        },
      },
      {
        $project: {
          user: "$deliveryAddress.name",
          items: { $size: "$items" }, // only show item count, not full item details
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
    return res.json({ result: orders });
  } catch (error) {
    console.log("failed to get all client orders -", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Returns all orders belonging to the currently logged-in user (customer order history).
// Uses aggregation to unwind items, join product details, then re-group by order.
// This allows returning a clean array of orders, each with their full product info,
// quantities, and order-level fields.
export const getAllOrders = async (req, res) => {
  try {
    let orders = await Order.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.userId),
        },
      },
      // Unwind items so each item becomes a separate document for the lookup
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
      // Re-group by order _id, collecting items back into an array
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

// Fetches complete details for a single order by ID.
// Unwinds and re-groups items to populate product details for each line item.
// Used on the order confirmation / order detail page shown to the customer after checkout.
export const getOrderData = async (req, res) => {
  try {
    let { id } = req.params;
    let data = await Order.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
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
          userId: 0, // exclude userId from the response for privacy
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

// Fetches full order details for the admin order detail view.
// Joins the user (customer) document and product details for each item.
// Uses preserveNullAndEmptyArrays so orders with deleted users or products still render.
// Returns a single order object after re-grouping unwound items.
export const getClientOrderDetails = async (req, res) => {
  try {
    let { id } = req.params;
    let data = (
      await Order.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(id) } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true, // keep order even if user was deleted
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
        {
          $unwind: {
            path: "$product",
            preserveNullAndEmptyArrays: true, // keep item even if product was deleted
          },
        },
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
      ])
    )[0];
    return res.json({ data });
  } catch (error) {
    console.log("fetching orders failed:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Confirms a placed order and deducts stock from the database.
// Only runs if:
//   - The order is currently in "placed" status (hasn't already been confirmed).
//   - All stock reservations for this order are still "active" (not cancelled/expired).
// For each reserved item, stock is decremented atomically using $inc with a $gte guard
// to ensure we never decrement below zero. After confirming:
//   - All reservation documents for this order are deleted (no longer needed).
//   - Order status is updated to "confirmed" with a history entry appended.
export const confirmOrder = async (req, res) => {
  try {
    let { id: orderId } = req.params;
    let order = await Order.findById(orderId);
    let reservations = await StockReservaton.find({ orderId });

    if (
      order.currentOrderStatus === "placed" &&
      reservations.every((item) => item.reservedStatus === "active")
    ) {
      // Decrement each product's stock by the reserved quantity atomically
      await Promise.all(
        reservations.map(async (item) => {
          await AutoProduct.updateOne(
            { _id: item.productId, stock: { $gte: item.reservedStock } },
            { $inc: { stock: -item.reservedStock } },
          );
        }),
      );
      // Cleanup reservations — stock is now permanently deducted
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
