import express from "express";
import { Category } from "../../schemas/productSchema.js";

const router = express.Router();
router.get("/", async (req, res) => {
  try {
    const search = req.query.search;
    let query = {};
    if (search) {
      query = {
        $or: [{ name: { $regex: search, $options: "i" } }],
      };
    }
    const categories = await Category.find(query);
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === "") {
    return res.status(400).json({ message: "Category name is required." });
  }

  try {
    const newCategory = new Category({ name });
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (Category POST):", err);
      return res
        .status(400)
        .json({ message: "Category with this name already exists." });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    console.error("Error adding category:", err);
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const category = await Category.findById(id);
    if (!category)
      return res.status(404).json({ message: "Category not found." });
    if (req.body.hasOwnProperty("name")) category.name = name;

    await category.save();
    res.json(category);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (Category PUT):", err);
      return res
        .status(400)
        .json({ message: "Category with this name already exists." });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    console.error("Error updating category:", err);
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Category.findByIdAndDelete(id);
    if (!result)
      return res.status(404).json({ message: "Category not found." });
    res.json({ message: "Category deleted successfully." });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
