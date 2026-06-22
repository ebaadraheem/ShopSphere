// routes/purchaseReturns.js
import express from "express";
import { PurchaseReturn } from "../../schemas/purchaseSchema.js";
import { Product } from "../../schemas/productSchema.js";
import { StockTransaction } from "../../schemas/productSchema.js";
import { SupplierAccount } from "../../schemas/peopleSchema.js";
const router = express.Router();
router.post("/", async (req, res) => {
  try {
    const {
      originalPurchase,
      returnInvoiceNumber,
      supplier,
      items,
      returnDate,
      notes,
      totalReturnAmount,
    } = req.body;

    if (!supplier || !items || items.length === 0) {
      return res.status(400).json({
        message:
          "Missing required fields: originalPurchase, supplier, and items are required.",
      });
    }
    // 1. Create Purchase Return Document
    const newPurchaseReturn = new PurchaseReturn({
      returnInvoiceNumber,
      originalPurchase: originalPurchase ? originalPurchase : null,
      supplier,
      returnDate,
      items,
      notes,
      totalReturnAmount,
    });

    await newPurchaseReturn.save();
    // 2. Update Product Stock and create Stock Transactions
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found.`);
      }

      product.stock -= item.returnedQuantity;
      await product.save();

      // Create Stock Transaction for this return
      const stockTransaction = new StockTransaction({
        product: item.product,
        quantity: item.returnedQuantity,
        type: "StockOut", // Stock in for returns
        reference: newPurchaseReturn._id, // Reference to this return
        referenceModel: "PurchaseReturn", // Model name for reference
        date: returnDate || new Date(), // Use provided return date or current date
      });
      await stockTransaction.save();
    }
    // 3. Update Supplier Account Balance
    const supplierAccount = await SupplierAccount.findOne({
      supplier: supplier,
    });

    if (!supplierAccount) {
      throw new Error("Supplier account not found. Cannot process return.");
    }
    const amountToDeduct = parseFloat(totalReturnAmount);
    if (isNaN(amountToDeduct)) {
      throw new Error("totalReturnAmount is not a valid number.");
    }
    supplierAccount.totalAmount -= amountToDeduct;
    await supplierAccount.save({});
    res.status(201).json(newPurchaseReturn);
  } catch (error) {
    console.error("Error creating purchase return:", error);
    res.status(500).json({
      message: error.message || "Server error during purchase return.",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const returns = await PurchaseReturn.find({})
      .populate("originalPurchase", "invoiceNumber purchaseDate")
      .populate("supplier", "name company")
      .populate("items.product", "name code")
      .sort({ returnDate: -1 });
    res.status(200).json(returns);
  } catch (error) {
    console.error("Error fetching purchase returns:", error);
    res.status(500).json({ message: error.message || "Server error." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const singleReturn = await PurchaseReturn.findOne({ returnInvoiceNumber: req.params.id })
  .populate("originalPurchase", "invoiceNumber purchaseDate")
  .populate("supplier", "name company")
  .populate("items.product", "name code");
    if (!singleReturn) {
      return res.status(404).json({ message: "Purchase return not found." });
    }
    res.status(200).json(singleReturn);
  } catch (error) {
    console.error("Error fetching single purchase return:", error);
    res.status(500).json({ message: error.message || "Server error." });
  }
});

router.get("/search/returns", async (req, res) => {
  const { query } = req.query;
  try {
    const regex = new RegExp(query, "i"); // Case-insensitive search
    const results = await PurchaseReturn.find({
      $or: [
        { returnInvoiceNumber: regex },
        { "supplier.name": regex },
        { "supplier.company": regex },
      ],
    })
      .populate("originalPurchase", "invoiceNumber purchaseDate")
      .populate("supplier", "name company")
      .populate("items.product", "name code");
    res.status(200).json(results);
  } catch (error) {
    console.error("Error searching purchase returns:", error);
    res.status(500).json({ message: error.message || "Server error." });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const purchaseReturn = await PurchaseReturn.findById(req.params.id);

    if (!purchaseReturn) {
      return res.status(404).json({ message: "Purchase return not found." });
    }

    res.status(200).json({
      message: "Purchase return deleted and changes reverted successfully.",
    });
  } catch (error) {
    console.error("Error deleting purchase return:", error);
    res.status(500).json({
      message: error.message || "Server error during purchase return deletion.",
    });
  }
});



export default router;
