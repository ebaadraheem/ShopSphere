import express from "express";
import { UOM } from "../../schemas/productSchema.js";

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
    const uoms = await UOM.find(query);
    res.json(uoms);
  } catch (err) {
    console.error("Error fetching UOMs:", err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ message: "UOM name is required." });
  }
  try {
    const newUOM = new UOM({ name });
    await newUOM.save();
    res.status(201).json(newUOM);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (UOM POST):", err);
      let errorMessage = "UOM with the same ";
      if (err.keyPattern.name) errorMessage += "name, ";
      errorMessage = errorMessage.slice(0, -2) + " already exists.";
      return res.status(400).json({ message: errorMessage });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    console.error("Error adding UOM:", err);
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const uom = await UOM.findById(id);
    if (!uom) return res.status(404).json({ message: "UOM not found." });
    if (req.body.hasOwnProperty("name")) uom.name = name;

    await uom.save();
    res.json(uom);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (UOM PUT):", err);
      let errorMessage = "UOM with the same ";
      if (err.keyPattern.name) errorMessage += "name, ";
      errorMessage = errorMessage.slice(0, -2) + " already exists.";
      return res.status(400).json({ message: errorMessage });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    console.error("Error updating UOM:", err);
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await UOM.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ message: "UOM not found." });
    res.json({ message: "UOM deleted successfully." });
  } catch (err) {
    console.error("Error deleting UOM:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
