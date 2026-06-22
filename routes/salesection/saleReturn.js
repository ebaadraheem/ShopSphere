import express from "express";
import { SaleReturn } from "../../schemas/saleSchema.js";
import { Product } from "../../schemas/productSchema.js";
import { StockTransaction } from "../../schemas/productSchema.js";
import { CustomerAccount } from "../../schemas/peopleSchema.js";
import mongoose from "mongoose";

const router = express.Router();
router.post("/", async (req, res) => {
  try {
    const {
      originalSale,
      returnInvoiceNumber,
      customer,
      items,
      returnDate,
      notes,
      totalReturnAmount,
      profit,
    } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Missing required fields: items are required.",
      });
    }

    const newSaleReturn = new SaleReturn({
      returnInvoiceNumber,
      originalSale: originalSale ? originalSale : null,
      customer: mongoose.Types.ObjectId.isValid(customer) ? customer : null,
      returnDate,
      items,
      notes,
      totalReturnAmount,
      profit,
    });
    await newSaleReturn.save();
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found.`);
      }

      product.stock += item.returnedQuantity;
      await product.save();
      const stockTransaction = new StockTransaction({
        product: item.product,
        quantity: item.returnedQuantity,
        type: "StockIn", // Stock in for returns
        reference: newSaleReturn._id, // Reference to this return
        referenceModel: "SaleReturn", // Model name for reference
        date: returnDate || new Date(), // Use provided return date or current date
      });
      await stockTransaction.save();
    }
    // 3. Update Customer Account
    if (customer) {
      const customerAccount = await CustomerAccount.findOne({
        customer: mongoose.Types.ObjectId.isValid(customer) ? customer : null,
      });
      let originalReturnAmount;
      if (customer) {
        for (const item of items) {
          const productsale = await Product.findById(item.product);
          if (!productsale) {
            throw new Error(`Product with ID ${item.product} not found.`);
          }
          originalReturnAmount += productsale.saleprice * item.returnedQuantity;
        }
      }

      if (customerAccount) {
        customerAccount.totalAmount -=
          (originalReturnAmount || totalReturnAmount) > 0
            ? originalReturnAmount || totalReturnAmount
            : 0;
        customerAccount.balance =
          customerAccount.totalAmount - customerAccount.paidAmount;
        await customerAccount.save();
      }
    }
    res.status(201).json(newSaleReturn);
  } catch (error) {
    console.error("Error creating sale return:", error);
    res.status(500).json({
      message: error.message || "Server error during sale return.",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const saleReturns = await SaleReturn.find()
      .populate("originalSale", "invoiceNumber saleDate")
      .populate("customer", "name phone email")
      .populate("items.product", "name code")
      .sort({ returnDate: -1, createdAt: -1 });
    res.status(200).json(saleReturns);
  } catch (error) {
    console.error("Error fetching sale returns:", error);
    res.status(500).json({ message: error.message || "Server error." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const saleReturn = await SaleReturn.findById(req.params.id)
      .populate("originalSale", "invoiceNumber saleDate")
      .populate("customer", "name phone email")
      .populate("items.product", "name code");

    if (!saleReturn) {
      return res.status(404).json({ message: "Sale return not found." });
    }
    res.status(200).json(saleReturn);
  } catch (error) {
    console.error(`Error fetching sale return ${req.params.id}:`, error);
    res.status(500).json({ message: error.message || "Server error." });
  }
});
router.get("/report/:id", async (req, res) => {
  try {
    const saleReturn = await SaleReturn.findOne({
      returnInvoiceNumber: req.params.id,
    })
      .populate("originalSale", "invoiceNumber saleDate")
      .populate("customer", "name phone email")
      .populate("items.product", "name code");

    if (!saleReturn) {
      return res.status(404).json({ message: "Sale return not found." });
    }
    res.status(200).json(saleReturn);
  } catch (error) {
    console.error(`Error fetching sale return ${req.params.id}:`, error);
    res.status(500).json({ message: error.message || "Server error." });
  }
});
router.get("/search/returns", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(200).json([]);
    }
    const saleReturns = await SaleReturn.find({
      returnInvoiceNumber: { $regex: query, $options: "i" },
    })
      .select("returnInvoiceNumber totalReturnAmount customerName")
      .limit(10);
    res.status(200).json(saleReturns);
  } catch (error) {
    console.error("Error searching sale returns:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const saleReturn = await SaleReturn.findByIdAndDelete(req.params.id);
    if (!saleReturn) {
      return res.status(404).json({ message: "Sale return not found." });
    }
    // Optionally, you can also handle stock adjustments and customer account updates here
    res.status(200).json({ message: "Sale return deleted successfully." });
  } catch (error) {
    console.error(`Error deleting sale return ${req.params.id}:`, error);
    res.status(500).json({ message: error.message || "Server error." });
  }
});

export default router;
