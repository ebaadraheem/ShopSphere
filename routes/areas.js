import express from "express";
import { AreaCategory } from "../schemas/general.js";
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
    const categories = await AreaCategory.find(query);
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
      .json({ message: "AreaCategory name is required." });
  }

  try {
    const newCategory = new AreaCategory({ name });
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (AreaCategory POST):", err);
      return res
        .status(400)
        .json({ message: "AreaCategory with this name already exists." });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    console.error("Error adding AreaCategory:", err);
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const category = await AreaCategory.findById(id);
    if (!category)
      return res.status(404).json({ message: "AreaCategory not found." });
    if (req.body.hasOwnProperty("name")) category.name = name;

    await category.save();
    res.json(category);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (AreaCategory PUT):", err);
      return res
        .status(400)
        .json({ message: "AreaCategory with this name already exists." });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    console.error("Error updating AreaCategory:", err);
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await AreaCategory.findByIdAndDelete(id);
    if (!result)
      return res.status(404).json({ message: "AreaCategory not found." });
    res.json({ message: "AreaCategory deleted successfully." });
  } catch (err) {
    console.error("Error deleting AreaCategory:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
