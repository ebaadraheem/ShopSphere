import express from "express";
import { Purchase } from "../../schemas/purchaseSchema.js";
import { Product, StockTransaction } from "../../schemas/productSchema.js";
import { Supplier, SupplierAccount } from "../../schemas/peopleSchema.js";

const router = express.Router();

/**
 * @param {string} supplierId
 * @param {number} totalAmountChange
 * @param {number} paidAmountChange
 */
async function updateSupplierAccount(
  supplierId,
  totalAmountChange = 0,
  paidAmountChange = 0
) {
  try {
    let supplierAccount = await SupplierAccount.findOneAndUpdate(
      { supplier: supplierId },
      {
        $inc: {
          totalAmount: totalAmountChange,
          paidAmount: paidAmountChange,
          balance: totalAmountChange - paidAmountChange,
        },
      },
      { new: true, upsert: true }
    );

    if (!supplierAccount) {
      console.warn(
        `Supplier account for supplier ${supplierId} not found, a new one was created.`
      );
    }
    return supplierAccount;
  } catch (error) {
    console.error(`Error updating supplier account for ${supplierId}:`, error);
    throw new Error("Failed to update supplier account.");
  }
}

router.get("/", async (req, res) => {
  try {
    const purchases = await Purchase.find({})
      .populate("supplier", "name companyName")
      .populate("items.product", "name code")
      .sort({ purchaseDate: -1 });

    const productIds = new Set();
    purchases.forEach((purchase) => {
      purchase.items.forEach((item) => {
        if (item.product && item.product._id) {
          productIds.add(item.product._id.toString());
        }
      });
    });

    const productsMap = new Map();
    if (productIds.size > 0) {
      const products = await Product.find({
        _id: { $in: Array.from(productIds) },
      });
      products.forEach((p) => productsMap.set(p._id.toString(), p));
    }

    const purchasesWithStock = purchases.map((purchase) => {
      const modifiedPurchase = purchase.toObject();

      modifiedPurchase.items = modifiedPurchase.items.map((item) => {
        const productDoc = productsMap.get(item.product._id.toString());
        return {
          ...item,
          instock: productDoc ? productDoc.stock : 0,
        };
      });
      return modifiedPurchase;
    });

    res.json(purchasesWithStock);
  } catch (err) {
    console.error("Error fetching purchases:", err);
    res
      .status(500)
      .json({ message: "Failed to retrieve purchases.", error: err.message });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(200).json([]);
    }
    const purchases = await Purchase.find({
      invoiceNumber: { $regex: query, $options: "i" },
    })
      .select("invoiceNumber totalAmount supplier.name supplier.companyName")
      .limit(10);
    res.status(200).json(purchases);
  } catch (error) {
    console.error("Error searching purchases:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/", async (req, res) => {
  const { invoiceNumber, supplier, purchaseDate, items, notes, paidAmount } =
    req.body;
  if (
    !invoiceNumber ||
    typeof invoiceNumber !== "string" ||
    invoiceNumber.trim() === ""
  ) {
    return res.status(400).json({
      message: "Invoice number is required and must be a non-empty string.",
    });
  }
  if (!supplier || typeof supplier !== "string" || supplier.trim() === "") {
    return res.status(400).json({ message: "Supplier ID is required." });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ message: "At least one item is required for a purchase." });
  }
  const parsedPaidAmount = parseFloat(paidAmount);
  if (
    paidAmount !== undefined &&
    (isNaN(parsedPaidAmount) || parsedPaidAmount < 0)
  ) {
    return res
      .status(400)
      .json({ message: "Paid amount must be a non-negative number." });
  }

  try {
    const existingSupplier = await Supplier.findById(supplier);
    if (!existingSupplier) {
      return res.status(404).json({ message: "Invalid Supplier ID provided." });
    }

    const purchaseItems = [];
    let totalPurchaseAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product with ID ${item.product} not found.` });
      }
      if (
        item.quantity === undefined ||
        isNaN(item.quantity) ||
        item.quantity <= 0
      ) {
        return res.status(400).json({
          message: `Invalid quantity for product "${product.name}". Quantity must be a positive number.`,
        });
      }
      if (
        item.purchasePrice === undefined ||
        isNaN(item.purchasePrice) ||
        item.purchasePrice < 0
      ) {
        return res.status(400).json({
          message: `Invalid purchase price for product "${product.name}". Purchase price must be a non-negative number.`,
        });
      }

      const itemTotal = item.quantity * item.purchasePrice;
      purchaseItems.push({
        product: item.product,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        total: itemTotal,
      });
      totalPurchaseAmount += itemTotal;
      product.stock += item.quantity;
      await product.save();
      const stockInTransaction = new StockTransaction({
        product: product._id,
        quantity: item.quantity,
        type: "StockIn",
        reference: null,
        referenceModel: "Purchase",
        notes: `Purchase from ${existingSupplier.companyName}`,
      });
    }

    const newPurchase = new Purchase({
      invoiceNumber: invoiceNumber.trim(),
      supplier,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      items: purchaseItems,
      totalAmount: totalPurchaseAmount,
      paidAmount: parsedPaidAmount || 0,
      notes: notes ? notes.trim() : "",
    });

    await newPurchase.save();
    for (const item of items) {
      const stockInTransaction = new StockTransaction({
        product: item.product,
        quantity: item.quantity,
        type: "StockIn",
        reference: newPurchase._id,
        referenceModel: "Purchase",
        notes: `Purchase #${newPurchase.invoiceNumber} from ${existingSupplier.companyName}`,
      });
      await stockInTransaction.save();
    }
    await updateSupplierAccount(
      supplier,
      totalPurchaseAmount,
      parsedPaidAmount || 0
    );

    const populatedPurchase = await Purchase.findById(newPurchase._id)
      .populate("supplier", "name companyName")
      .populate("items.product", "name code");

    res.status(201).json(populatedPurchase);
  } catch (err) {
    console.error("Error creating purchase:", err);
    if (err.code === 11000) {
      return res.status(409).json({
        message: `Purchase with invoice number "${invoiceNumber}" already exists.`,
        error: err.message,
      });
    }
    res
      .status(500)
      .json({ message: "Failed to create purchase.", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const purchaseToDelete = await Purchase.findById(id);

    if (!purchaseToDelete) {
      return res.status(404).json({ message: "Purchase not found." });
    }

    for (const item of purchaseToDelete.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock = Math.max(0, product.stock - item.quantity);
        await product.save();
        const stockOutTransaction = new StockTransaction({
          product: product._id,
          quantity: item.quantity,
          type: "StockOut",
          reference: purchaseToDelete._id,
          referenceModel: "Purchase",
          notes: `Reversal of Purchase #${purchaseToDelete.invoiceNumber} - Stock decrement`,
        });
        await stockOutTransaction.save();
      } else {
        console.warn(
          `Product with ID ${item.product} for deleted purchase ${id} not found during stock reversal.`
        );
      }
    }
    await updateSupplierAccount(
      purchaseToDelete.supplier,
      -purchaseToDelete.totalAmount,
      -purchaseToDelete.paidAmount
    );

    await Purchase.deleteOne({ _id: id });

    res.status(200).json({
      message: "Purchase deleted successfully and related records updated.",
    });
  } catch (err) {
    console.error("Error deleting purchase:", err);
    res
      .status(500)
      .json({ message: "Failed to delete purchase.", error: err.message });
  }
});

router.get("/search-by-invoice/:invoiceNumber", async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    if (!invoiceNumber) {
      return res.status(400).json({ message: "Invoice number is required." });
    }
    const purchase = await Purchase.findOne({ invoiceNumber: invoiceNumber })
      .populate("supplier", "name company")
      .populate("items.product", "name code");

    if (!purchase) {
      return res.status(404).json({
        message: "Original purchase not found with this invoice number.",
      });
    }
    const modifiedPurchase = purchase.toObject();

    for (let i = 0; i < modifiedPurchase.items.length; i++) {
      const item = modifiedPurchase.items[i];
      const productDoc = await Product.findById(item.product._id);
      if (productDoc) {
        modifiedPurchase.items[i].instock = productDoc.stock;
      } else {
        modifiedPurchase.items[i].instock = 0;
        console.warn(
          `Product with ID ${item.product._id} not found for purchase item.`
        );
      }
    }
    res.status(200).json(modifiedPurchase);
  } catch (error) {
    console.error("Error fetching purchase by invoice number:", error);
    res.status(500).json({ message: error.message || "Server error." });
  }
});

router.post("/payments", async (req, res) => {
  const { supplierId, amountPaid, paymentDate, notes } = req.body;

  if (
    !supplierId ||
    !amountPaid ||
    isNaN(amountPaid) ||
    parseFloat(amountPaid) <= 0
  ) {
    return res.status(400).json({
      message: "Supplier ID and a valid positive amountPaid are required.",
    });
  }

  const parsedAmountPaid = parseFloat(amountPaid);

  try {
    const supplierAccount = await SupplierAccount.findOneAndUpdate(
      { supplier: supplierId },
      { $inc: { paidAmount: parsedAmountPaid } },
      { new: true, upsert: true }
    );

    if (!supplierAccount) {
      return res.status(404).json({
        message: "Supplier account not found for the given supplier ID.",
      });
    }

    res.status(200).json({
      message: `Payment of ${parsedAmountPaid.toFixed(
        2
      )} successfully recorded for supplier.`,
      supplierAccount: supplierAccount,
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res
      .status(500)
      .json({ message: "Failed to record payment.", error: error.message });
  }
});

router.get("/accounts/:supplierId", async (req, res) => {
  try {
    const supplierAccount = await SupplierAccount.findOne({
      supplier: req.params.supplierId,
    }).populate("supplier", "name companyName email phone");

    if (!supplierAccount) {
      return res.status(200).json({
        supplier: req.params.supplierId,
        totalAmount: 0,
        paidAmount: 0,
        balance: 0,
        createdAt: null,
        updatedAt: null,
        message: "Supplier account not found, assuming zero balance.",
      });
    }
    res.status(200).json(supplierAccount);
  } catch (err) {
    console.error("Error fetching supplier account:", err);
    res.status(500).json({
      message: "Failed to retrieve supplier account.",
      error: err.message,
    });
  }
});

export default router;
