import mongoose, { Types } from "mongoose";
import AutoProduct from "../models/autoProductModel.js";
import Cart from "../models/cartModel.js";
import StockReservaton from "../models/reservationModel.js";

// Checks whether a specific product is already in the current user's cart.
// Returns a boolean `result` — used by the frontend to conditionally show
// "Add to Cart" vs "Go to Cart" buttons.
export const getData = async (req, res) => {
  try {
    let { id: productId } = req.params;
    const result = await Cart.exists({
      userId: req.userId,
      "items.productId": productId,
    });

    res.json({ result: !!result });
  } catch (error) {
    console.log("cart-product error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Fetches the user's full cart with product and brand details populated.
// For each cart item, computes the real-time available_stock by subtracting
// active reservation quantities from the product's total stock.
// The displayed available stock is capped at 6 so the quantity selector
// doesn't show unreasonably large numbers (business rule for UX).
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.userId }).populate({
      path: "items.productId",
      populate: {
        path: "brand",
      },
    });

    // For each item, calculate available stock by checking active reservations
    let items = await Promise.all(
      cart.items.map(async (item) => {
        let newItem = item.toObject();
        // Aggregate total reserved quantity across all active reservations for this product
        let reserved_product_data = await StockReservaton.aggregate([
          {
            $match: {
              productId: new mongoose.Types.ObjectId(item.productId._id),
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
        let available_product_stock =
          item.productId.stock - (reserved_product_data[0]?.count || 0);

        // Cap at 6 to limit the quantity selector options shown to the user
        if (available_product_stock <= 6)
          newItem.available_stock = available_product_stock;
        else newItem.available_stock = 6;
        return newItem;
      }),
    );
    console.log("items:", items);
    return res.json({ cart: { items, cartTotal: cart.cartTotal } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Adds a product to the user's cart with a default quantity of 1.
// Fetches the current product price at add-time, not at checkout,
// so the cart total always reflects the price when the item was added.
// If the user has no cart yet, creates a new cart document.
// Otherwise, pushes the new item to the existing cart and recalculates cartTotal.
export const addToCart = async (req, res) => {
  let { productId } = req.body;
  let quantity = 1;

  // When offer model is added, first check if any offer doc is created with the respective productID
  try {
    console.log("req.body:", req.body);
    let { price } = await AutoProduct.findOne({ _id: productId }).select(
      "price",
    );

    let totalAmount = price * quantity;
    let item = {
      productId,
      price,
      quantity,
      totalAmount,
    };
    let cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      // No cart exists yet — create one with this item as the first entry
      let new_cart = await Cart.create({
        userId: req.userId,
        items: [item],
        cartTotal: totalAmount,
      });

      return res.status(200).json({
        message: "Product  Added to Cart",
      });
    }

    // Cart already exists — append the item and update the running total
    cart.items.push(item);
    cart.cartTotal += totalAmount;

    await cart.save();

    return res.json({ message: "Product  Added to Cart" });
  } catch (error) {
    console.log("error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Updates the quantity of a specific cart item identified by its sub-document _id (req.params.id).
// Uses a MongoDB pipeline update with $map to iterate over items and conditionally update
// the matching one. cartTotal is then recalculated in a second $set stage by summing
// all item totalAmounts, keeping the cart total always in sync.
export const updateCartItem = async (req, res) => {
  try {
    await Cart.updateOne(
      {
        userId: req.userId,
      },
      [
        {
          $set: {
            items: {
              $map: {
                input: "$items",
                as: "item",
                in: {
                  $cond: [
                    // Find the matching item by its sub-document _id
                    { $eq: ["$$item._id", new Types.ObjectId(req.params.id)] },
                    {
                      $mergeObjects: [
                        "$$item",
                        {
                          quantity: req.body.quantity,
                          totalAmount: {
                            // Recalculate item total using the stored price
                            $multiply: ["$$item.price", req.body.quantity],
                          },
                        },
                      ],
                    },
                    "$$item",
                  ],
                },
              },
            },
          },
        },
        {
          // Recalculate cart total by summing all item totalAmounts
          $set: {
            cartTotal: {
              $sum: {
                $map: {
                  input: "$items",
                  as: "item",
                  in: "$$item.totalAmount",
                },
              },
            },
          },
        },
      ],
    );

    res.json({ message: "cart updated" });
  } catch (error) {
    console.log("item update error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Removes a single item from the cart using its sub-document _id (req.params.id).
// Uses $filter in a pipeline update to exclude the matching item, then recalculates
// cartTotal by summing the remaining items' totalAmounts in the same update.
export const removeCartItem = async (req, res) => {
  try {
    await Cart.updateOne({ userId: req.userId }, [
      {
        $set: {
          items: {
            $filter: {
              input: "$items",
              as: "item",
              // Keep all items except the one matching the target _id
              cond: { $ne: ["$$item._id", new Types.ObjectId(req.params.id)] },
            },
          },
        },
      },
      {
        // Recalculate cart total after removing the item
        $set: {
          cartTotal: {
            $sum: {
              $map: {
                input: "$items",
                as: "item",
                in: "$$item.totalAmount",
              },
            },
          },
        },
      },
    ]);
    return res.json({ message: "cart item removed" });
  } catch (error) {
    console.log("cart item removal error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Completely removes the user's cart document from the database.
// Called after a successful checkout to start fresh for the next order.
export const clearCart = async (req, res) => {
  try {
    await Cart.deleteOne({ userId: req.userId });
    res.status(200).json({ message: "Cart Successfully Cleared" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
