import express from "express";
import { SupplierAccount, Supplier } from "../../schemas/peopleSchema.js";
import { Purchase } from "../../schemas/purchaseSchema.js";
import { Payment } from "../../schemas/general.js";
import mongoose from "mongoose";
import { isValid, startOfDay, endOfDay } from "date-fns";
const router = express.Router();
router.get("/with-accounts", async (req, res) => {
  try {
    const suppliers = await Supplier.aggregate([
      {
        $lookup: {
          from: "supplieraccounts", // The collection name for SupplierAccount (usually lowercase and plural)
          localField: "_id",
          foreignField: "supplier",
          as: "supplierAccount",
        },
      },
      {
        $unwind: {
          path: "$supplierAccount",
          preserveNullAndEmptyArrays: true, // Keep suppliers even if no account exists
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          companyName: 1,
          email: 1,
          cnic: 1,
          phone: 1,
          address: 1,
          website: 1,
          paymentTerms: 1,
          contactperson1: 1, // Include full contact person objects
          contactperson2: 1,
          "supplierAccount.totalAmount": 1, // Optional, if you want it in the main table
          "supplierAccount.paidAmount": 1, // Optional
          "supplierAccount.balance": 1, // Include balance for display
          "supplierAccount._id": 1, // Needed if you want to link to account
          createdAt: 1, // Include timestamps if useful
          updatedAt: 1,
        },
      },
    ]);
    res.status(200).json(suppliers);
  } catch (error) {
    console.error("Error fetching all suppliers with accounts:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/:supplierId", async (req, res) => {
  try {
    const { supplierId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ message: "Invalid Supplier ID" });
    }

    const supplierAccount = await SupplierAccount.findOne({
      supplier: supplierId,
    }).populate("supplier");

    if (!supplierAccount) {
      return res.status(404).json({ message: "Supplier account not found" });
    }

    res.status(200).json(supplierAccount);
  } catch (error) {
    console.error("Error fetching supplier account:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/suppliers", async (req, res) => {
  const {
    name,
    companyName,
    email,
    cnic,
    phone,
    address,
    website,
    paymentTerms,
    contactperson1,
    contactperson2,
  } = req.body;

  try {
    const newSupplier = new Supplier({
      name,
      companyName,
      email,
      cnic,
      phone,
      address,
      website,
      paymentTerms,
      contactperson1,
      contactperson2,
    });
    await newSupplier.save();
    // Create a new supplier account for the new supplier
    const newSupplierAccount = new SupplierAccount({
      supplier: newSupplier._id,
      totalAmount: 0,
      paidAmount: 0,
      balance: 0,
    });
    await newSupplierAccount.save();

    res
      .status(201)
      .json({ supplier: newSupplier, supplierAccount: newSupplierAccount });
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/:supplierId/payments", async (req, res) => {
  try {
    const { supplierId } = req.params;
    let { startDate, endDate } = req.query;
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ message: "Invalid Supplier ID" });
    }

    const supplierAccount = await SupplierAccount.findOne({
      supplier: supplierId,
    });

    if (!supplierAccount) {
      return res.status(404).json({ message: "Supplier account not found" });
    }

    const query = { account: supplierAccount._id };

    // Normalize date range
    if (startDate || endDate) {
      query.paymentDate = {};

      if (startDate) {
        query.paymentDate.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = end;
      }
    }

    const payments = await Payment.find(query)
      .populate("account", "supplier") // Populate supplier field in account
      .sort({ paymentDate: -1 }); // Sort by payment date, most recent first

    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching payments for supplier:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/:supplierId/payments", async (req, res) => {
  const { supplierId } = req.params;
  const { amount, paymentMethod, referenceNumber, notes } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ message: "Invalid Supplier ID" });
    }

    // Find SupplierAccount using the supplier ID
    const supplierAccount = await SupplierAccount.findOne({
      supplier: supplierId,
    });

    if (!supplierAccount) {
      return res.status(404).json({ message: "Supplier account not found" });
    }

    if (paymentMethod !== "Cash" && !referenceNumber) {
      return res.status(400).json({
        message: "Reference number is required for non-cash payments.",
      });
    }

    // Create a new payment
    const newPayment = new Payment({
      accountType: "SupplierAccount",
      account: supplierAccount._id,
      amount,
      paymentMethod,
      referenceNumber,
      notes,
      paymentDate: new Date(),
    });
    await newPayment.save();

    supplierAccount.paidAmount += amount;
    supplierAccount.balance =
      supplierAccount.totalAmount - supplierAccount.paidAmount;
    await supplierAccount.save();

    res.status(201).json(newPayment);
  } catch (error) {
    console.error("Error adding payment:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.delete("/suppliers/:supplierId", async (req, res) => {
  try {
    const { supplierId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ message: "Invalid Supplier ID" });
    }
    // Find the supplier
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    // Find and delete the associated supplier account
    const supplierAccount = await SupplierAccount.findOneAndDelete({
      supplier: supplierId,
    });

    // Delete all payments associated with this supplier account (if account existed)
    if (supplierAccount) {
      await Payment.deleteMany({ account: supplierAccount._id });
    }
    // Finally, delete the supplier
    await Supplier.findByIdAndDelete(supplierId);
    res
      .status(200)
      .json({ message: "Supplier and associated data deleted successfully" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/:supplierId/purchase-reports", async (req, res) => {

  const { supplierId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const query = {};

    if (supplierId !== "all") {
      query.supplier = supplierId;
    }

    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) {
        query.purchaseDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include entire end date
        query.purchaseDate.$lte = end;
      }
    }

    const purchases = await Purchase.find(query)
      .populate("supplier", "name")
      .sort({ purchaseDate: -1 });

    const response = purchases.map((purchase) => ({
      invoiceNumber: purchase.invoiceNumber,
      supplierName: purchase.supplier?.name || "N/A",
      totalAmount: purchase.totalAmount,
      paidAmount: purchase.paidAmount,
      balance: purchase.balance,
      purchaseDate: purchase.purchaseDate,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error generating purchase report:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get('/:supplierId/detail-purchase-report', async (req, res) => {
    try {
        const { supplierId } = req.params;
        const { productId, startDate, endDate } = req.query;

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (!isValid(start) || !isValid(end)) {
            return res.status(400).json({ msg: 'Invalid date format provided.' });
        }
        const detailedReport = await Purchase.aggregate([
            {
                $match: {
                    purchaseDate: {
                        $gte: startOfDay(start),
                        $lte: endOfDay(end),
                    },
                },
            },
            ...(supplierId && supplierId !== 'all' && mongoose.Types.ObjectId.isValid(supplierId)
                ? [{ $match: { supplier: new mongoose.Types.ObjectId(supplierId) } }]
                : []
            ),
            { $unwind: '$items' },
            ...(productId && productId !== 'all' && mongoose.Types.ObjectId.isValid(productId)
                ? [{ $match: { 'items.product': new mongoose.Types.ObjectId(productId) } }]
                : []
            ),
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'productInfo',
                },
            },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
             // 5a. Lookup UOM Details from Product
            {
                $lookup: {
                    from: 'uoms', // Assuming your UOM collection is named 'uoms'
                    localField: 'productInfo.uom',
                    foreignField: '_id',
                    as: 'uomInfo'
                }
            },
            { $unwind: { path: '$uomInfo', preserveNullAndEmptyArrays: true } },
            // 6. Group back by original purchase invoice
            {
                $group: {
                    _id: '$_id',
                    invoiceNumber: { $first: '$invoiceNumber' },
                    purchaseDate: { $first: '$purchaseDate' },
                    supplier: { $first: '$supplier' },
                    totalAmount: { $first: '$totalAmount' },
                    paidAmount: { $first: '$paidAmount' },
                    balance: { $first: '$balance' },
                    items: {
                        $push: {
                            _id: '$items._id',
                            product: '$items.product',
                            quantity: '$items.quantity',
                            purchasePrice: '$items.purchasePrice',
                            total: '$items.total',
                            name: '$productInfo.name',
                            uom: '$uomInfo.name' // Add the UOM name
                        },
                    },
                },
            },
            // 7. Lookup Supplier Details
            {
                $lookup: {
                    from: 'suppliers',
                    localField: 'supplier',
                    foreignField: '_id',
                    as: 'supplierInfo',
                },
            },
            { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
            // 8. Project the final shape
            {
                $project: {
                    _id: 1,
                    invoiceNumber: 1,
                    purchaseDate: 1,
                    supplierName: '$supplierInfo.name',
                    supplierContact: '$supplierInfo.phone', // Fetch contact
                    supplierAddress: '$supplierInfo.address', // Fetch address
                    products: '$items',
                    totalAmount: 1,
                    paidAmount: 1,
                    balance: 1,
                }
            },
            // 9. Sort the final results
            { $sort: { purchaseDate: -1 } }
        ]);

        res.json(detailedReport);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/:supplierId/purchase-summary-report', async (req, res) => {
    try {
        const { supplierId } = req.params;
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (!isValid(start) || !isValid(end)) {
            return res.status(400).json({ msg: 'Invalid date format provided.' });
        }
        const summaryReport = await Purchase.aggregate([
            {
                $match: {
                    purchaseDate: {
                        $gte: startOfDay(start),
                        $lte: endOfDay(end),
                    },
                },
            },
            ...(supplierId && supplierId !== 'all' && mongoose.Types.ObjectId.isValid(supplierId)
                ? [{ $match: { supplier: new mongoose.Types.ObjectId(supplierId) } }]
                : []
            ),
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product', // Group by the product's ObjectId
                    totalQuantity: { $sum: '$items.quantity' },
                    totalValue: { $sum: { $multiply: ['$items.quantity', '$items.purchasePrice'] } }
                }
            },
            // 5. Lookup Product Details to get the name
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo',
                },
            },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
            // 6. Project the final shape
            {
                $project: {
                    _id: 0,
                    productId: '$_id',
                    productName: '$productInfo.name',
                    totalQuantity: 1,
                    totalValue: 1,
                }
            },
            // 7. Sort by product name
            { $sort: { productName: 1 } }
        ]);

        res.json(summaryReport);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/supplier/payables', async (req, res) => {
    try {
        const suppliers = await Supplier.aggregate([
            {
                $lookup: {
                    from: "supplieraccounts",
                    localField: "_id",
                    foreignField: "supplier",
                    as: "account",
                },
            },
            { $unwind: "$account" }, // Only include suppliers that have an account
            { $match: { "account.balance": { $gt: 0 } } }, // Filter for payables
            {
                $project: {
                    _id: 1, name: 1, companyName: 1, phone: 1,
                    balance: "$account.balance"
                }
            }
        ]);
        res.json(suppliers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Fetches suppliers with a balance < 0 (they owe us)
router.get('/supplier/receivables', async (req, res) => {
    try {
        const suppliers = await Supplier.aggregate([
            {
                $lookup: {
                    from: "supplieraccounts",
                    localField: "_id",
                    foreignField: "supplier",
                    as: "account",
                },
            },
            { $unwind: "$account" },
            { $match: { "account.balance": { $lt: 0 } } }, // Filter for receivables
            {
                $project: {
                    _id: 1, name: 1, companyName: 1, phone: 1,
                    balance: "$account.balance"
                }
            }
        ]);
        res.json(suppliers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
