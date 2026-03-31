import AutoCategory from "../models/autoCategoryModel.js";

// Fetches a single category by its ID, with two modes of response based on the `filter` param:
// - "product-list": Returns the category with its parent populated (lightweight, for product listing pages).
// - default: Also returns sibling categories at the same parent level if the category is not level-1.
//   This lets admin forms populate the "parent category" dropdown correctly.
export const getCategoryById = async (req, res) => {
  const { id } = req.params;
  const { filter } = req.query;
  console.log("id", id);
  try {
    const category = await AutoCategory.findOne({ _id: id }).populate("parent");
    switch (filter) {
      case "product-list":
        res.status(200).json({ success: true, category });
        break;
      default:
        // Fetch potential parent options (categories one level up) for admin edit forms
        let parents = [];
        if (category.level !== 1)
          parents = await AutoCategory.find({ level: category.level - 1 });

        res.status(200).json({ success: true, category, parents });
        break;
    }
  } catch (error) {
    console.error(
      "error when trying to fetch the category by id.",
      error.message,
    );
    res.status(500).json({ success: false, message: error.message });
  }
};

// A multi-purpose category listing handler controlled by the `filter` query param:
//
// - "all": Admin table listing — joins parent category name and filters by search query.
//   Returns total_pages for pagination calculation on the frontend.
//
// - "product-category": Full list with parent populated — used when creating/editing products.
//
// - "parent": Returns all categories one level above the given level (for parent dropdown in forms).
//
// - "level": Recursively discovers all existing category levels and returns them as an array.
//   Used to render level-selection dropdowns.
//
// - "title": Checks if a category with the given title already exists (for uniqueness validation),
//   but only if the title has actually changed from actual_title.
//
// - "nav-bar": Builds a nested tree structure (parent → children → grandchildren) for the
//   site navigation bar. Uses a recursive helper getDropdown() to assemble the hierarchy.
export const getCategories = async (req, res) => {
  try {
    const { filter, current_page } = req.query;
    let limit = 12;
    let categories = [];
    switch (filter) {
      case "all":
        // Admin listing: join parent name, apply search filter, return with page count
        categories = await AutoCategory.aggregate([
          {
            $lookup: {
              from: "autocategories",
              localField: "parent",
              foreignField: "_id",
              as: "parent",
            },
          },
          {
            $unwind: {
              path: "$parent",
              preserveNullAndEmptyArrays: true, // root-level categories have no parent
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
              title: 1,
              level: 1,
              parent: "$parent.title",
            },
          },
          {
            $match: {
              title: { $regex: req.query.search, $options: "i" },
            },
          },
        ]);
        return res.json({
          result: categories,
          total_pages: Math.ceil(categories.length / limit),
        });
      case "product-category":
        categories = await AutoCategory.find().populate("parent");
        return res.status(200).json({ success: true, categories });
      case "parent":
        // Return categories that can serve as parent (one level above the requested level)
        const level = parseInt(req.query.level);
        let parentCategories = [];
        if (level !== 1) {
          parentCategories = await AutoCategory.find({ level: level - 1 });
        }
        return res.status(200).json({ success: true, parentCategories });
      case "level":
        categories = await AutoCategory.find().populate("parent");
        // Recursively finds all levels that have at least one category — used for level dropdowns
        const getLevelsCount = (categories, currentLevel = 1, levels = [1]) => {
          const matchingLevel = categories.find(
            (category) => category.level === currentLevel,
          );
          if (matchingLevel) {
            levels.push(currentLevel + 1);
            return getLevelsCount(categories, currentLevel + 1, levels);
          } else return levels;
        };
        const levels = getLevelsCount(categories);
        return res.status(200).json({ success: true, levels });
      case "title":
        // Only check for a duplicate title if the user actually changed the title field
        const { title, actual_title } = req.query;
        let matchingCategory = null;
        if (title !== actual_title) {
          matchingCategory = await AutoCategory.findOne({ title });
        }
        console.log("mathcing category:", matchingCategory);
        return res.status(200).json({ success: true, matchingCategory });
      case "nav-bar":
        categories = await AutoCategory.find();

        // Recursively builds a nested tree: each node contains its children (or null if leaf)
        let getDropdown = (categories, parent = null) => {
          let parents = categories.filter(
            (cata) => String(cata.parent) === String(parent),
          );
          if (!parents.length) return null;
          return parents.map((item) => ({
            _id: item._id,
            title: item.title,
            slug: item.slug,
            children: getDropdown(categories, item._id),
          }));
        };

        const dropdown = getDropdown(categories);
        return res.json({ categories: dropdown });

      case "slug":
        return;
      default:
        break;
    }
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Creates a new category. Automatically generates a URL-friendly slug from the title
// by lowercasing and replacing spaces with hyphens (e.g., "Engine Parts" → "engine-parts").
export async function createCategory(req, res) {
  try {
    const data = req.body;
    console.log("data:", data);
    let category_data = { ...data };
    category_data.slug = category_data.title.toLowerCase().split(" ").join("-");
    await AutoCategory.create(category_data);
    res.status(200).json({ message: "Category successfully created" });
  } catch (error) {
    console.log("error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Updates an existing category's fields by ID.
// Spreads the entire request body into the update — ensure the frontend only sends
// the fields that are meant to change.
export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    await AutoCategory.updateOne({ _id: id }, { ...data });
    res
      .status(200)
      .json({ success: true, message: "Category successfully updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Deletes a category after checking that no other categories reference it as a parent.
// Blocking deletion prevents orphaned child categories in the hierarchy.
// On successful deletion, returns the updated full category list so the frontend
// can refresh without a separate request.
export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    // Prevent deletion if any child category still references this one as a parent
    const childrens = await AutoCategory.findOne({
      parent: id,
    });
    if (childrens) {
      return res.status(200).json({
        delete: false,
        success: true,
        message:
          "This category cannot be deleted. This category is referenced by other categories",
      });
    }
    await AutoCategory.deleteOne({ _id: id });
    const categories = await AutoCategory.find().populate("parent");

    return res.status(200).json({
      categories,
      delete: true,
      success: true,
      message: "Category successfully deleted",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
