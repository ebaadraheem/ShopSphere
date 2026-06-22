import express from "express";
import {
  Product,
  Category,
  UOM,
  StockTransaction,
} from "../../schemas/productSchema.js";

const router = express.Router();

const validateProductData = async (
  data,
  isNewProduct = true,
  currentProductId = null
) => {
  const { name, code, costprice, saleprice, stock, expiryDate, category, uom } =
    data;
  const errors = [];

  if (!name || typeof name !== "string" || name.trim() === "")
    errors.push("Product name is required.");
  if (!code || typeof code !== "string" || code.trim() === "")
    errors.push("Product code is required.");

  if (
    costprice !== undefined &&
    (isNaN(parseFloat(costprice)) || parseFloat(costprice) < 0)
  ) {
    errors.push("Cost price must be a non-negative number.");
  }
  if (
    saleprice !== undefined &&
    (isNaN(parseFloat(saleprice)) || parseFloat(saleprice) < 0)
  ) {
    errors.push("Sale price must be a non-negative number.");
  }
  if (stock !== undefined && stock !== null && stock !== "") {
    const parsedStock = parseInt(stock);
    if (isNaN(parsedStock) || parsedStock < 0) {
      errors.push("Stock Quantity must be a non-negative integer.");
    }
  }

  if (!category || typeof category !== "string" || category.trim() === "") {
    errors.push("Category is required.");
  }
  if (!uom || typeof uom !== "string" || uom.trim() === "") {
    errors.push("Unit of Measure (UOM) is required.");
  }
  if (expiryDate) {
    const date = new Date(expiryDate);
    if (isNaN(date.getTime())) {
      errors.push("Invalid expiry date format.");
    }
  }

  if (isNewProduct && code && code.trim() !== "") {
    const existingProductByCode = await Product.findOne({ code: code.trim() });
    if (existingProductByCode) {
      errors.push("Product with this code already exists.");
    }
  } else if (!isNewProduct && code && code.trim() !== "") {
    const existingProductByCode = await Product.findOne({ code: code.trim() });
    if (
      existingProductByCode &&
      existingProductByCode._id.toString() !== currentProductId
    ) {
      errors.push("Another product with this code already exists.");
    }
  }

  return errors;
};

router.get("/", async (req, res) => {
  try {
    const search = req.query.search;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { code: { $regex: search, $options: "i" } },
        ],
      };
    }
    const products = await Product.find(query)
      .populate("category", "name")
      .populate("uom", "name");
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res
      .status(500)
      .json({ message: "Failed to retrieve products.", error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name")
      .populate("uom", "name");
    if (!product)
      return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch (err) {
    console.error("Error fetching product by ID:", err);
    res
      .status(500)
      .json({ message: "Failed to retrieve product.", error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { name, code, costprice, saleprice, stock, expiryDate, category, uom } =
    req.body;
  const validationErrors = await validateProductData(req.body, true);
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors.join(" ") });
  }

  try {
    const initialStock = parseInt(stock) || 0;

    const newProduct = new Product({
      name,
      code,
      costprice: parseFloat(costprice) || 0,
      saleprice: parseFloat(saleprice) || 0,
      stock: initialStock,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      category,
      uom,
    });
    await newProduct.save();
    if (initialStock > 0) {
      try {
        const initialStockTransaction = new StockTransaction({
          product: newProduct._id,
          quantity: initialStock,
          type: "StockIn",
          reference: newProduct._id,
          referenceModel: "InventoryAdjustment",
          notes: `Initial stock for new product: ${newProduct.name} (${newProduct.code})`,
        });
        await initialStockTransaction.save();
      } catch (stockTransErr) {
        console.error(
          "Error recording initial StockIn transaction:",
          stockTransErr
        );
      }
    }

    const populatedProduct = await Product.findById(newProduct._id)
      .populate("category", "name")
      .populate("uom", "name");
    res.status(201).json(populatedProduct);
  } catch (err) {
    console.error("Error creating product:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res
        .status(409)
        .json({
          message: `Product with this ${field} already exists.`,
          error: err.message,
        });
    }
    res
      .status(500)
      .json({ message: "Failed to create product.", error: err.message });
  }
});
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  const oldStock = product.stock;
  const mergedData = { ...product.toObject(), ...updateData };
  const validationErrors = await validateProductData(mergedData, false, id);
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors.join(" ") });
  }

  try {
    product.name =
      updateData.name !== undefined ? updateData.name : product.name;
    product.code =
      updateData.code !== undefined ? updateData.code : product.code;
    product.costprice =
      updateData.costprice !== undefined
        ? parseFloat(updateData.costprice)
        : product.costprice;
    product.saleprice =
      updateData.saleprice !== undefined
        ? parseFloat(updateData.saleprice)
        : product.saleprice;
    product.category =
      updateData.category !== undefined
        ? updateData.category
        : product.category;
    product.uom = updateData.uom !== undefined ? updateData.uom : product.uom;
    if (updateData.expiryDate === "") {
      product.expiryDate = null;
    } else if (updateData.expiryDate !== undefined) {
      product.expiryDate = new Date(updateData.expiryDate);
    }
    if (updateData.stock !== undefined) {
      const newStock = parseInt(updateData.stock);
      if (!isNaN(newStock) && newStock >= 0) {
        product.stock = newStock;

        const stockDifference = newStock - oldStock;

        if (stockDifference !== 0) {
          const transactionType = stockDifference > 0 ? "StockIn" : "StockOut";
          const transactionQuantity = Math.abs(stockDifference);
          const notes = `Manual stock adjustment: ${transactionType} of ${transactionQuantity} units. Old stock: ${oldStock}, New stock: ${newStock}.`;

          const stockAdjustmentTransaction = new StockTransaction({
            product: product._id,
            quantity: transactionQuantity,
            type: "Adjustment",
            reference: product._id,
            referenceModel: "InventoryAdjustment",
            notes: notes,
          });
          await stockAdjustmentTransaction.save();
        }
      }
    }

    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name")
      .populate("uom", "name");

    res.json(populatedProduct);
  } catch (err) {
    console.error("Error updating product:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res
        .status(409)
        .json({
          message: `Another product with this ${field} already exists.`,
          error: err.message,
        });
    }
    res
      .status(500)
      .json({ message: "Failed to update product.", error: err.message });
  }
});
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const stockDeleteResult = await StockTransaction.deleteMany({
      product: id,
    });
    const productDeleteResult = await Product.findByIdAndDelete(id);
    if (!productDeleteResult) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json({
      message:
        "Product and all associated stock transactions deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting product:", err);
    res
      .status(500)
      .json({ message: "Failed to delete product.", error: err.message });
  }
});

export default router;
