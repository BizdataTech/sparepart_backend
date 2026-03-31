import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import getToken from "../utils/getToken.js";
import verifyPassword from "../utils/verifyPassword.js";
import mongoose from "mongoose";

// Internal helper (not exported) — fetches a user's profile fields by ID using aggregation.
// Returns only username, email, and addresses. Called by getUser to keep the handler clean.
const getUserData = async (id) => {
  let data = (
    await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $project: {
          username: 1,
          email: 1,
          addresses: 1,
        },
      },
    ])
  )[0];
  return data;
};

// Verifies the currently logged-in user's session is still valid and the account is not blocked.
// If the user is blocked, the auth cookie is cleared and a 403 is returned.
// This is called on app load/refresh to keep the frontend auth state in sync.
export const verifyState = async (req, res) => {
  try {
    let user = await User.findById(req.userId).select("_id blocked");
    if (user.blocked)
      return res
        .clearCookie("token", {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
        })
        .status(403)
        .json({ message: "Access Denied" });
    return res.json({ user: user._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Returns the logged-in user's profile data (username, email, addresses).
// Delegates to getUserData() to keep the aggregation logic centralized.
export const getUser = async (req, res) => {
  try {
    let user = await getUserData(req.userId);
    console.log("user fetch data:", user);
    res.json({ user });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Registers a new customer account.
// Checks for email uniqueness before creating to return a clear conflict message.
// Password is hashed with bcrypt (10 salt rounds) before storage.
// On success, a JWT token is set as an httpOnly cookie to log the user in immediately.
export const signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    let matchingUser = await User.findOne({ email });
    if (matchingUser) {
      return res.status(409).json({ message: "Email already taken" });
    }
    const hashedPasword = await bcrypt.hash(password, 10);
    const new_user = await User.create({
      username,
      email,
      password: hashedPasword,
    });

    const token = getToken(new_user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    // restrict fields
    res
      .status(200)
      .json({ message: "User Successfully Created", user: new_user._id });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Authenticates a customer user with email and password.
// Uses verifyPassword() (bcrypt compare wrapper) to validate credentials.
// Blocked users are rejected even with correct credentials.
// On success, sets a JWT in an httpOnly cookie.
export const signinUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    let matchingUser = await User.findOne({ email }).select(
      "_id password blocked",
    );
    if (!matchingUser) {
      return res.status(401).json({ message: "Invalid Email or Password" });
    }
    const compareResult = await verifyPassword(password, matchingUser.password);
    if (!compareResult) {
      return res.status(401).json({ message: "Invalid Email or Password" });
    }
    // Reject login if admin has blocked this account
    if (matchingUser.blocked)
      return res.status(403).json({ message: "User Access Denied" });
    let token = getToken(matchingUser._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res
      .status(200)
      .json({ message: "User Authenticated", user: matchingUser._id });
  } catch (error) {
    console.error("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Updates the currently logged-in user's display name.
// Validates the new username is not empty or whitespace-only before saving.
export const updateUsername = async (req, res) => {
  try {
    let { username } = req.body;
    if (!username.trim().length)
      return res.status(400).json({ message: "Username cannot be empty" });
    await User.updateOne({ _id: req.userId }, { $set: { username } });
    res.json({ message: "Username updated" });
  } catch (error) {
    console.log("failed to update the username:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Updates the user's email address after checking that it is not already in use.
// Returns 409 if the email is taken by another account.
export const updateUserEmail = async (req, res) => {
  try {
    let { email } = req.body;
    let matching_email = await User.findOne({ email });
    if (matching_email)
      return res.status(409).json({ message: "Email already taken" });
    await User.updateOne({ _id: req.userId }, { $set: { email } });
    return res.json({ message: "User email updated" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Adds a new address to the user's addresses array.
// Uses a MongoDB pipeline update to set the new address and determine its `default` field:
//   - If the user has no addresses yet, the new one is automatically set as default.
//   - Otherwise, default is set to false.
// A new ObjectId is generated for the address sub-document for later targeting with positional operators.
export const addAddress = async (req, res) => {
  try {
    let result = await User.findByIdAndUpdate(req.userId, [
      {
        $set: {
          addresses: {
            $concatArrays: [
              "$addresses",
              [
                {
                  _id: new mongoose.Types.ObjectId(),
                  ...req.body,
                  // Auto-set as default only if this is the user's first address
                  default: {
                    $cond: [{ $eq: [{ $size: "$addresses" }, 0] }, true, false],
                  },
                },
              ],
            ],
          },
        },
      },
    ]);
    return res.json({ message: "user updated with address" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Fetches the user's delivery addresses. `type` query param determines the scope:
//
// - "all": Returns every address the user has saved.
//
// - "default": Returns only the address flagged as default using an aggregation filter.
//   This is used to pre-select the delivery address at checkout.
export const getUserAddress = async (req, res) => {
  let { type } = req.query;
  try {
    switch (type) {
      case "all":
        let { addresses } = await User.findOne({ _id: req.userId }).select(
          "addresses -_id",
        );
        return res.json({ addresses });
      case "default":
        // Use aggregation to filter the addresses array for the default=true entry
        let address = await User.aggregate([
          { $match: { _id: new mongoose.Types.ObjectId(req.userId) } },
          {
            $addFields: {
              address: {
                $filter: {
                  input: "$addresses",
                  as: "address",
                  cond: { $eq: ["$$address.default", true] },
                },
              },
            },
          },
          {
            $project: {
              address: 1,
            },
          },
          { $unwind: "$address" },
        ]);
        return res.json({ address: address[0]?.address });
      default:
        return;
    }
  } catch (error) {
    console.log("Failed to fetch user address:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Returns a single address by its sub-document _id using MongoDB's positional projection ($).
// The filter in findOne targets the specific address; `addresses.$` returns only that element.
export const getAddress = async (req, res) => {
  try {
    let address = await User.findOne(
      {
        _id: req.userId,
        "addresses._id": req.params.id,
      },
      { "addresses.$": 1 }, // $ returns only the matched element of the array
    );
    return res.json({ address: address.addresses[0] });
  } catch (error) {
    console.log("address fetch error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Updates the default address flag for a specific address.
// Because only one address can be default at a time:
//   1. First sets all addresses' default to false.
//   2. Then sets the targeted address's default to the value from req.body (true or false).
// This two-step approach avoids having two defaults simultaneously.
export const updateAddress = async (req, res) => {
  try {
    let userId = req.userId;

    // Step 1: Clear default from every address
    await User.findByIdAndUpdate(userId, {
      $set: { "addresses.$[].default": false },
    });

    // Step 2: Set the specific address's default to the requested value
    await User.updateOne(
      { _id: userId, "addresses._id": req.params.id },
      {
        $set: {
          "addresses.$.default": req.body.default,
        },
      },
    );

    res.json({ message: "address updated" });
  } catch (error) {
    console.log("update error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Removes a specific address from the user's addresses array using $pull.
// $pull filters out the matching sub-document by its _id.
export const deleteAddress = async (req, res) => {
  try {
    let { id } = req.params;
    console.log("address id:", id);
    await User.findByIdAndUpdate(req.userId, {
      $pull: { addresses: { _id: id } },
    });
    res.json({ message: "Address Deleted" });
  } catch (error) {
    console.log("address deletion failure:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Retrieves all products in the user's wishlist with full product and brand details.
// Uses aggregation to unwind wishlist entries, join product and brand data, then
// re-groups to return a clean wishlist array sorted by the date each item was added.
export const getWishlistProducts = async (req, res) => {
  try {
    let user_wishlist = await User.findById(req.userId, { wishlist: 1 });
    console.log("user wishlist:", user_wishlist);
    // Short-circuit if wishlist is empty to avoid unnecessary aggregation
    if (!user_wishlist || user_wishlist.wishlist.length === 0)
      return res.json({ products: [] });
    let products = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.userId) } },
      // Unwind each wishlist entry so we can join product data per entry
      { $unwind: "$wishlist" },
      {
        $lookup: {
          from: "autoproducts",
          localField: "wishlist.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 1,
          "wishlist.addedAt": 1,
          "product._id": 1,
          "product.product_title": 1,
          "product.brand": 1,
          "product.price": 1,
          "product.images": 1,
        },
      },
      {
        // Join brand separately to get full brand document (name, image, etc.)
        $lookup: {
          from: "brands",
          localField: "product.brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },
      {
        // Embed brand data directly into the product object
        $addFields: {
          "product.brand": "$brand",
        },
      },
      { $sort: { "wishlist.addedAt": 1 } }, // sort by when the item was wishlisted
      {
        // Re-group to produce a single document per user with a wishlist array
        $group: {
          _id: "$_id",
          wishlist: {
            $push: "$product",
          },
        },
      },
    ]);
    console.log("wishlist products:", products[0].wishlist);
    return res.json({ products: products[0].wishlist });
  } catch (error) {
    console.log("failed to fetch wishlist products:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Checks whether a specific product is already in the user's wishlist.
// Returns a boolean `result` used by the frontend to toggle the wishlist icon state.
export const getData = async (req, res) => {
  try {
    let { id } = req.params;
    let matching_product = await User.findOne({
      _id: req.userId,
      "wishlist.productId": id,
    });
    if (matching_product) return res.json({ result: true });
    return res.json({ result: false });
  } catch (error) {
    console.log("failed to fetch product wishlist data.", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Adds a product to the user's wishlist.
// Checks for duplicates first to prevent the same product being wished twice.
// Uses $addToSet as an extra safeguard against duplication even if the pre-check is bypassed.
// Each entry also records an addedAt timestamp for sorting on the wishlist page.
export const addToWishlist = async (req, res) => {
  try {
    let { productId } = req.body;
    // Pre-check: return 409 if product is already in the wishlist
    let matching_product = await User.findOne({
      _id: req.userId,
      "wishlist.productId": { $in: [productId] },
    });
    if (matching_product)
      return res
        .status(409)
        .json({ message: "Failed : Product already exist in wishlist" });
    console.log(matching_product ? true : false);
    // $addToSet is used here as a failsafe — it won't add duplicates at the DB level
    await User.updateOne(
      { _id: req.userId },
      { $addToSet: { wishlist: { productId, addedAt: new Date() } } },
    );
    return res.json({ message: "product added to wishlist" });
  } catch (error) {
    console.log("failed to add product in wishlist:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Removes a product from the user's wishlist using $pull.
// $pull filters out the matching wishlist entry by productId.
export const removeFromWishlist = async (req, res) => {
  try {
    let { productId } = req.params;
    console.log("productId:", productId);
    await User.updateOne(
      { _id: req.userId },
      { $pull: { wishlist: { productId } } },
    );
    return res.json({ message: "product removed from db" });
  } catch (error) {
    console.log("failed to remover product from wishlist", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Logs out the user by clearing the auth cookie on the client side.
// No DB operation is required — the session lives only in the cookie.
export const logoutUser = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ success: true, message: "User Logged Out" });
};
