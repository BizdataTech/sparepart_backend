import { Types } from "mongoose";
import AutoProduct from "../models/autoProductModel.js";
import Cart from "../models/cartModel.js";

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

export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.userId }).populate({
      path: "items.productId",
      populate: {
        path: "brand",
      },
    });
    res.json({ cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addToCart = async (req, res) => {
  let { productId } = req.body;
  let quantity = 1;

  // When offer model is added, first check if any offer doc is created with the respective productID
  try {
    console.log("req.body:", req.body);
    let { price } = await AutoProduct.findOne({ _id: productId }).select(
      "price"
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
      let new_cart = await Cart.create({
        userId: req.userId,
        items: [item],
        cartTotal: totalAmount,
      });

      return res.status(200).json({
        message: "Product  Added to Cart",
      });
    }

    cart.items.push(item);
    cart.cartTotal += totalAmount;

    await cart.save();

    return res.json({ message: "Product  Added to Cart" });
  } catch (error) {
    console.log("error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

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
                    { $eq: ["$$item._id", new Types.ObjectId(req.params.id)] },
                    {
                      $mergeObjects: [
                        "$$item",
                        {
                          quantity: req.body.quantity,
                          totalAmount: {
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
      ]
    );

    res.json({ message: "cart updated" });
  } catch (error) {
    console.log("item update error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    await Cart.updateOne({ userId: req.userId }, [
      {
        $set: {
          items: {
            $filter: {
              input: "$items",
              as: "item",
              cond: { $ne: ["$$item._id", new Types.ObjectId(req.params.id)] },
            },
          },
        },
      },
      {
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

export const clearCart = async (req, res) => {
  try {
    await Cart.deleteOne({ userId: req.userId });
    res.status(200).json({ message: "Cart Successfully Cleared" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
