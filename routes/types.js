import express from "express";
import { TypesCategory } from "../schemas/general.js";

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
    const categories = await TypesCategory.find(query);
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res
      .status(400)
      .json({ message: "TypesCategory name is required." });
  }

  try {
    const newCategory = new TypesCategory({ name });
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (TypesCategory POST):", err);
      return res
        .status(400)
        .json({ message: "TypesCategory with this name already exists." });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    console.error("Error adding TypesCategory:", err);
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const category = await TypesCategory.findById(id);
    if (!category)
      return res.status(404).json({ message: "TypesCategory not found." });
    if (req.body.hasOwnProperty("name")) category.name = name;

    await category.save();
    res.json(category);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (TypesCategory PUT):", err);
      return res
        .status(400)
        .json({ message: "TypesCategory with this name already exists." });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    console.error("Error updating TypesCategory:", err);
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await TypesCategory.findByIdAndDelete(id);
    if (!result)
      return res.status(404).json({ message: "TypesCategory not found." });
    res.json({ message: "TypesCategory deleted successfully." });
  } catch (err) {
    console.error("Error deleting TypesCategory:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
