import AutoCategory from "../models/autoCategoryModel.js";

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

export const getCategories = async (req, res) => {
  try {
    const { filter, current_page } = req.query;
    let limit = 12;
    let categories = [];
    switch (filter) {
      case "all":
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
              preserveNullAndEmptyArrays: true,
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
        const level = parseInt(req.query.level);
        let parentCategories = [];
        if (level !== 1) {
          parentCategories = await AutoCategory.find({ level: level - 1 });
        }
        return res.status(200).json({ success: true, parentCategories });
      case "level":
        categories = await AutoCategory.find().populate("parent");
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
        const { title, actual_title } = req.query;
        let matchingCategory = null;
        if (title !== actual_title) {
          matchingCategory = await AutoCategory.findOne({ title });
        }
        console.log("mathcing category:", matchingCategory);
        return res.status(200).json({ success: true, matchingCategory });
      case "nav-bar":
        categories = await AutoCategory.find();

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

export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
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
