import Category from "../models/categoryModel.js";
import mongoose from "mongoose";

// get category by id
export const getCategoryById = async (req, res) => {
  const { id } = req.params;
  const { filter } = req.query;
  console.log("id", id);
  try {
    const category = await Category.findOne({ _id: id }).populate("parent");
    switch (filter) {
      case "product-list":
        res.status(200).json({ success: true, category });
        break;
      default:
        let parents = [];
        if (category.level !== 1)
          parents = await Category.find({ level: category.level - 1 });

        res.status(200).json({ success: true, category, parents });
        break;
    }
  } catch (error) {
    console.error(
      "error when trying to fetch the category by id.",
      error.message
    );
    res.status(500).json({ success: false, message: error.message });
  }
};

export async function deleteAllCategories(req, res) {
  await Category.deleteMany({});
  res.status(200).json({ success: true });
}

export async function getCategories(req, res) {
  const { filter, current_page } = req.query;
  let limit = 12;
  try {
    const categories = await Category.find().populate("parent");
    const total = await Category.countDocuments();
    switch (filter) {
      case "all":
        let page_categories = await Category.find()
          .skip(limit * (Number(current_page) - 1))
          .limit(limit);
        return res.status(200).json({
          success: true,
          categories: page_categories,
          total_pages: Math.ceil(total / limit),
        });
      case "product-category":
        
        return res.status(200).json({ success: true, categories });
      case "level":
        const getLevelsCount = (categories, currentLevel = 1, levels = [1]) => {
          const matchingLevel = categories.find(
            (category) => category.level === currentLevel
          );
          if (matchingLevel) {
            levels.push(currentLevel + 1);
            return getLevelsCount(categories, currentLevel + 1, levels);
          } else return levels;
        };
        const levels = getLevelsCount(categories);
        return res.status(200).json({ success: true, levels });
      case "parent":
        const level = Number(req.query.level);
        let parentCategories = [];
        if (level !== 1) {
          parentCategories = await Category.find({ level: level - 1 });
        }
        return res.status(200).json({ success: true, parentCategories });
      case "title":
        const { title, actual_title } = req.query;
        let matchingCategory = null;
        if (title !== actual_title) {
          matchingCategory = await Category.findOne({ title });
        }
        console.log("mathcing category:", matchingCategory);
        return res.status(200).json({ success: true, matchingCategory });
      default:
        break;
    }
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
}

export async function getCategoryProductCode(req, res) {
  const { id } = req.params;
  console.log("id:", typeof id);

  try {
    let [match] = await Category.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      { $project: { categoryProductCount: 1, _id: 0 } },
    ]);
    console.log(match);
    if (!match)
      res.status(404).json({ message: "Requested Category Not Found!" });
    else
      res.status(200).json({
        message: "success",
        categoryProductCount: match.categoryProductCount,
      });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
}

export async function createCategory(req, res) {
  try {
    const data = req.body;
    console.log("data:", data);
    const newCategory = await Category.create(data);
    res
      .status(200)
      .json({ message: "Category successfully created", data: newCategory });
  } catch (error) {
    console.log("error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    await Category.updateOne({ _id: id }, { ...data });
    res
      .status(200)
      .json({ success: true, message: "Category successfully updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const childrens = await Category.findOne({
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
    await Category.deleteOne({ _id: id });
    const categories = await Category.find();

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
