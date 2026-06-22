// src/routes/customerRoutes.js
import express from "express";
import { CustomerAccount, Customer } from "../../schemas/peopleSchema.js";
import { Payment } from "../../schemas/general.js";
import mongoose from "mongoose";
import { Transaction } from "../../schemas/general.js";
import { isValid, startOfDay, endOfDay } from "date-fns";

const router = express.Router();

// Get all customers with accounts
router.get("/with-accounts", async (req, res) => {
  try {
    const customers = await Customer.aggregate([
      {
        $lookup: {
          from: "customeraccounts", // The collection name for CustomerAccount
          localField: "_id",
          foreignField: "customer",
          as: "customerAccount",
        },
      },
      {
        $unwind: {
          path: "$customerAccount",
          preserveNullAndEmptyArrays: true, // Keep customers even if no account exists
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          cnic: 1,
          phone: 1,
          address: 1,
          "customerAccount.totalAmount": 1,
          "customerAccount.paidAmount": 1,
          "customerAccount.balance": 1,
          "customerAccount._id": 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);
    res.status(200).json(customers);
  } catch (error) {
    console.error("Error fetching all customers with accounts:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Get a single customer's account
router.get("/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid Customer ID" });
    }

    const customerAccount = await CustomerAccount.findOne({
      customer: customerId,
    }).populate("customer"); // Populate the actual customer object

    if (!customerAccount) {
      return res.status(404).json({ message: "Customer account not found" });
    }

    res.status(200).json(customerAccount);
  } catch (error) {
    console.error("Error fetching customer account:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Add a new customer
router.post("/", async (req, res) => {
  const {
    name,
    email,
    cnic,
    phone,
    address,
  } = req.body;

  try {
    const newCustomer = new Customer({
      name,
      email,
      cnic,
      phone,
      address,
    });

    await newCustomer.save();

    // Create a new customer account for the new customer
    const newCustomerAccount = new CustomerAccount({
      customer: newCustomer._id,
      totalAmount: 0, // Initialize with zero amounts
      paidAmount: 0,
      balance: 0,
    });
    await newCustomerAccount.save();

    res
      .status(201)
      .json({ customer: newCustomer, customerAccount: newCustomerAccount });
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Get payments for a customer
router.get("/:customerId/payments", async (req, res) => {
  try {
    const { customerId } = req.params;
    let { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid Customer ID" });
    }

    const customerAccount = await CustomerAccount.findOne({
      customer: customerId,
    });

    if (!customerAccount) {
      return res.status(200).json([]); // Return empty array if no account exists
    }

    const query = { account: customerAccount._id };

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
      .populate("account", "customer") // Populate customer field in account
      .sort({ paymentDate: -1 }); 
    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching payments for customer:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Add payment to customer account
router.post("/:customerId/payments", async (req, res) => {
  const { customerId } = req.params;
  const { amount, paymentMethod, referenceNumber, notes } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid Customer ID" });
    }

    const customerAccount = await CustomerAccount.findOne({
      customer: customerId,
    });

    if (!customerAccount) {
      return res.status(404).json({ message: "Customer account not found" });
    }

    if (paymentMethod !== "Cash" && !referenceNumber) {
      return res
        .status(400)
        .json({
          message: "Reference number is required for non-cash payments.",
        });
    }

    const newPayment = new Payment({
      accountType: "CustomerAccount", 
      account: customerAccount._id, 
      amount,
      paymentMethod,
      referenceNumber,
      notes,
      paymentDate: new Date(),
    });

    await newPayment.save();
    // Update customer account balance
    customerAccount.paidAmount += amount;
    customerAccount.balance = customerAccount.totalAmount - customerAccount.paidAmount;
    await customerAccount.save();

    res.status(201).json(newPayment);
  } catch (error) {
    console.error("Error adding payment to customer:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Delete a customer
router.delete("/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid Customer ID" });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const customerAccount = await CustomerAccount.findOneAndDelete({
      customer: customerId,
    });

    if (customerAccount) {
      await Payment.deleteMany({ customerAccount: customerAccount._id });
    }

    await Customer.findByIdAndDelete(customerId);

    res
      .status(200)
      .json({ message: "Customer and associated data deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/:customerId/sales-reports", async (req, res) => {

  const { customerId } = req.params;
  const { startDate, endDate } = req.query;


  try {
    const query = {};

    if (customerId !== "all") {
      query.customerId = customerId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include entire end date
        query.date.$lte = end;
      }
    }

    const sales = await Transaction.find(query)
      .populate("customerId")
      .sort({ date: -1 });

    const response = sales.map((sale) => ({
      invoiceNumber: sale.receiptId,
      customerName: sale.customerId?.name || "Walk-in Customer",
      totalAmount: sale.totalAmount,
      paidAmount: sale.paidAmount,
      discount: sale.discount,
      saleDate: sale.date,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error generating sale report:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get('/:customerId/detail-sales-report', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { productId, startDate, endDate } = req.query;

        // --- Validation ---
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (!isValid(start) || !isValid(end)) {
            return res.status(400).json({ msg: 'Invalid date format provided.' });
        }
        const detailedReport = await Transaction.aggregate([
            {
                $match: {
                    date: {
                        $gte: startOfDay(start),
                        $lte: endOfDay(end),
                    },
                },
            },
            // 2. Conditionally Match by Customer
            ...(customerId && customerId !== 'all' && mongoose.Types.ObjectId.isValid(customerId)
                ? [{ $match: { customerId: new mongoose.Types.ObjectId(customerId) } }]
                : []
            ),
            // 3. Unwind products for individual processing
            { $unwind: '$products' },
            // 4. Conditionally Match by Product
            ...(productId && productId !== 'all' && mongoose.Types.ObjectId.isValid(productId)
                ? [{ $match: { 'products.productId': new mongoose.Types.ObjectId(productId) } }]
                : []
            ),
            // 5. Lookup Product Details (to get UOM)
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.productId',
                    foreignField: '_id',
                    as: 'productInfo',
                },
            },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
            // 5a. Lookup UOM Details from Product
            {
                $lookup: {
                    from: 'uoms',
                    localField: 'productInfo.uom',
                    foreignField: '_id',
                    as: 'uomInfo'
                }
            },
            { $unwind: { path: '$uomInfo', preserveNullAndEmptyArrays: true } },
            // 6. Group back by original sale
            {
                $group: {
                    _id: '$_id',
                    receiptId: { $first: '$receiptId' },
                    date: { $first: '$date' },
                    customerId: { $first: '$customerId' },
                    customerNameDefault: { $first: '$customerName' }, // Keep the default name
                    totalAmount: { $first: '$totalAmount' },
                    paidAmount: { $first: '$paidAmount' },
                    discount: { $first: '$discount' },
                    returnAmount: { $first: '$returnAmount' },
                    products: {
                        $push: {
                            _id: '$products._id',
                            productId: '$products.productId',
                            quantity: '$products.quantity',
                            price: '$products.price',
                            name: '$products.name', // Name is already in the sale document
                            uom: '$uomInfo.name'
                        },
                    },
                },
            },
            // 7. Lookup Customer Details
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customerId',
                    foreignField: '_id',
                    as: 'customerInfo',
                },
            },
            { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
            // 8. Project the final shape
            {
                $project: {
                    _id: 1,
                    receiptId: 1,
                    date: 1,
                    customerName: { $ifNull: [ '$customerInfo.name', '$customerNameDefault' ] },
                    customerContact: '$customerInfo.phone',
                    customerAddress: '$customerInfo.address',
                    products: 1,
                    totalAmount: 1,
                    paidAmount: 1,
                    discount: 1,
                    returnAmount: 1,
                }
            },
            { $sort: { date: -1 } }
        ]);

        res.json(detailedReport);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/:customerId/sales-summary-report', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { startDate, endDate } = req.query;

        // --- Validation ---
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (!isValid(start) || !isValid(end)) {
            return res.status(400).json({ msg: 'Invalid date format provided.' });
        }

        // --- Build and Execute Aggregation Pipeline ---
        const summaryReport = await Transaction.aggregate([
            // 1. Initial Match Stage: Filter by date range
            {
                $match: {
                    date: {
                        $gte: startOfDay(start),
                        $lte: endOfDay(end),
                    },
                },
            },
            // 2. Conditionally Match by Customer
            ...(customerId && customerId !== 'all' && mongoose.Types.ObjectId.isValid(customerId)
                ? [{ $match: { customerId: new mongoose.Types.ObjectId(customerId) } }]
                : []
            ),
            // 3. Unwind items for individual processing
            { $unwind: '$products' },
            // 4. Group by product to calculate totals
            {
                $group: {
                    _id: '$products.productId', // Group by the product's ObjectId
                    productName: { $first: '$products.name' }, // The name is already on the sub-document
                    totalQuantity: { $sum: '$products.quantity' },
                    totalValue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
                }
            },
            // 5. Project the final shape
            {
                $project: {
                    _id: 0,
                    productId: '$_id',
                    productName: 1,
                    totalQuantity: 1,
                    totalValue: 1,
                }
            },
            // 6. Sort by product name
            { $sort: { productName: 1 } }
        ]);

        res.json(summaryReport);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get("/customers/payables", async (req, res) => {
  try {
    const customers = await Customer.aggregate([
      {
        $lookup: {
          from: "customeraccounts",
          localField: "_id",
          foreignField: "customer",
          as: "customerAccount",
        },
      },
      {
        $unwind: "$customerAccount", // Only include customers with an account
      },
      {
        $match: {
          "customerAccount.balance": { $gt: 0 }, // Filter for balances greater than 0
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          phone: 1,
          balance: "$customerAccount.balance",
        },
      },
    ]);
    res.status(200).json(customers);
  } catch (error) {
    console.error("Error fetching customer payables:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/customers/receivables", async (req, res) => {
  try {
    const customers = await Customer.aggregate([
      {
        $lookup: {
          from: "customeraccounts",
          localField: "_id",
          foreignField: "customer",
          as: "customerAccount",
        },
      },
      {
        $unwind: "$customerAccount",
      },
      {
        $match: {
          "customerAccount.balance": { $lt: 0 }, // Filter for balances less than 0
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          phone: 1,
          balance: "$customerAccount.balance",
        },
      },
    ]);
    res.status(200).json(customers);
  } catch (error) {
    console.error("Error fetching customer receivables:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});



export default router;
