import express from "express";
import { Transaction } from "../../schemas/general.js"; // Adjust the import path as necessary
import { Product } from "../../schemas/productSchema.js";
import { CustomerAccount } from "../../schemas/peopleSchema.js";
import { SaleReturn } from "../../schemas/saleSchema.js";
import { EmployeeAccount } from "../../schemas/peopleSchema.js";
import { SupplierAccount } from "../../schemas/peopleSchema.js";
import { Expense } from "../../schemas/expenseSchema.js";
import mongoose from "mongoose";
const router = express.Router();

router.post("/", async (req, res) => {
  const {
    products,
    customerId,
    customerName,
    totalAmount,
    discount,
    profit,
    paidAmount,
    employeeId,
  } = req.body;
  if (
    !products ||
    products.length === 0 ||
    totalAmount === undefined ||
    paidAmount === undefined
  ) {
    return res
      .status(400)
      .json({ message: "Missing required transaction fields." });
  }

  try {
    const newTransaction = new Transaction({
      products,
      customerId: customerId || undefined, // allow optional/null
      customerName: customerName || "Walk-in Customer",
      totalAmount,
      discount: discount || 0,
      profit: profit || 0,
      paidAmount: paidAmount > totalAmount ? totalAmount : paidAmount || paidAmount,
      balance: paidAmount - totalAmount,
      employeeId: employeeId || "unknown", // fallback if uid is undefined
    });
    await newTransaction.save();

    // 1. Update product stock
    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        console.error(`Product with ID ${item.productId} not found.`);
        continue;
      }
      if (item.quantity > product.stock) {
        console.error(`Insufficient stock for product ${product.name}.`);
        return res
          .status(400)
          .json({ message: `Insufficient stock for product ${product.name}.` });
      }
      product.stock -= item.quantity; // Deduct the sold quantity
      await product.save();
    }
    if (customerId) {
      try {
        const customerAccount = await CustomerAccount.findOne({
          customer: mongoose.Types.ObjectId.isValid(customerId)
            ? customerId
            : null,
        });
        if (customerAccount) {
          customerAccount.totalAmount += totalAmount;
          customerAccount.paidAmount += paidAmount > totalAmount ? totalAmount : paidAmount || paidAmount;
          customerAccount.balance =
            customerAccount.totalAmount - customerAccount.paidAmount;
        } else {
          const newCustomerAccount = new CustomerAccount({
            customer: customerId,
            totalAmount: totalAmount,
            paidAmount: paidAmount > totalAmount ? totalAmount : paidAmount || paidAmount,
            balance: totalAmount - (paidAmount > totalAmount ? totalAmount : paidAmount || paidAmount),
          });
          await newCustomerAccount.save();
        }
        await customerAccount.save();
        await customerAccount.save(); // Save the updated customerAccount with the new balance
      } catch (accountErr) {
        console.error(
          `Error processing CustomerAccount for ${customerId}:`,
          accountErr
        );
      }
    }

    res.status(201).json(newTransaction);
  } catch (err) {
    console.error("Error saving transaction:", err);
    res
      .status(500)
      .json({ message: "Failed to process transaction: " + err.message });
  }
});

router.get("/today", async (req, res) => {
  const requestedEmployeeId = req.query.employeeId;

  const today = new Date();
  const localMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const tomorrow = new Date(localMidnight);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const query = {
    date: { $gte: localMidnight, $lt: tomorrow },
  };
  if (
    typeof requestedEmployeeId === "string" &&
    requestedEmployeeId.trim() !== "" &&
    requestedEmployeeId !== "null" &&
    requestedEmployeeId !== "undefined"
  ) {
    query.employeeId = requestedEmployeeId;
  }
  try {
    const sales = await Transaction.find(query).sort({ date: -1 });
    res.status(200).json(sales);
  } catch (err) {
    console.error("Error fetching today's sales:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch sales data: " + err.message });
  }
});

router.get("/", async (req, res) => {
  const requestedEmployeeId = req.query.employeeId;
  const query = {};
  if (
    typeof requestedEmployeeId === "string" &&
    requestedEmployeeId.trim() !== "" &&
    requestedEmployeeId !== "null" &&
    requestedEmployeeId !== "undefined"
  ) {
    query.employeeId = requestedEmployeeId;
  }
  try {
    const transactions = await Transaction.find(query).sort({ date: -1 });
    res.status(200).json(transactions);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch transactions: " + err.message });
  }
});

router.get("/search-by-invoice/:receiptId", async (req, res) => {
  try {
    const { receiptId } = req.params;

    if (!receiptId) {
      return res.status(400).json({ message: "Invoice number is required." });
    }

    const sale = await Transaction.findOne({
      receiptId: receiptId,
    }).populate("customerId", "name phone email");

    if (!sale) {
      return res.status(404).json({
        message: "Original sale not found with this invoice number.",
      });
    }

    const modifiedSale = sale.toObject();

    for (let i = 0; i < modifiedSale.products.length; i++) {
      const item = modifiedSale.products[i];
      const productDoc = await Product.findById(item.productId);
      if (productDoc) {
        modifiedSale.products[i].instock = productDoc.stock;
        modifiedSale.products[i].costprice = productDoc.costprice || 0;
      } else {
        modifiedSale.products[i].instock = 0;
        console.warn(
          `Product with ID ${item.product._id} not found for sale item.`
        );
      }
    }
    res.status(200).json(modifiedSale);
  } catch (error) {
    res.status(500).json({ message: error.message || "Server error." });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query?.trim()) {
      return res.status(200).json([]);
    }
    const sales = await Transaction.find({
      receiptId: { $regex: query, $options: "i" },
    })
      .select("receiptId totalAmount customerName")
      .limit(10)
      .lean();
    const formattedResults = sales.map(({ receiptId, ...rest }) => ({
      invoiceNumber: receiptId,
      ...rest,
    }));

    return res.status(200).json(formattedResults);
  } catch (error) {
    console.error("Error searching sales:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

router.get("/profit-loss", async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ message: "Start date and end date are required." });
  }

  const TransactionTotalProfit = await Transaction.aggregate([
    {
      $match: {
        date: {
          $gte: new Date(startDate),
          $lt: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: null,
        totalProfit: { $sum: "$profit" },
        totalSales: { $sum: "$totalAmount" },
      },
    },
    {
      $project: {
        _id: 0,
        totalProfit: 1,
        totalSales: 1,
      },
    },
  ]);
  const SalesReturnTotalProfit = await SaleReturn.aggregate([
    {
      $match: {
        returnDate: {
          $gte: new Date(startDate),
          $lt: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: null,
        totalProfit: { $sum: "$profit" },
        totalReturnAmount: { $sum: "$totalReturnAmount" },
      },
    },
    {
      $project: {
        _id: 0,
        totalProfit: 1,
        totalReturnAmount: 1,
      },
    },
  ]);
  const totalExpenses = await Expense.aggregate([
    {
      $match: {
        date: {
          $gte: new Date(startDate),
          $lt: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: "$amount" },
      },
    },
    {
      $project: {
        _id: 0,
        totalExpenses: 1,
      },
    },
  ]);

  res.status(200).json({
    totalSalesProfit: TransactionTotalProfit[0]?.totalProfit || 0,
    totalSalesAmount: TransactionTotalProfit[0]?.totalSales || 0,
    totalReturnProfit: SalesReturnTotalProfit[0]?.totalProfit || 0,
    totalReturnAmount: SalesReturnTotalProfit[0]?.totalReturnAmount || 0,
    totalExpenses: totalExpenses[0]?.totalExpenses || 0,
    netProfit: (TransactionTotalProfit[0]?.totalProfit || 0) + (SalesReturnTotalProfit[0]?.totalProfit || 0) - (totalExpenses[0]?.totalExpenses || 0),
  });
});

router.get("/business-capital", async (req, res) => {
  try {
    const getAggregateSum = async (model, field, condition = {}) => {
      const result = await model.aggregate([
        { $match: condition },
        { $group: { _id: null, total: { $sum: `$${field}` } } },
        { $project: { _id: 0, total: 1 } },
      ]);
      return result[0]?.total || 0;
    };

    const getStockValue = async () => {
      const result = await Product.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ["$costprice", "$stock"] } },
          },
        },
        { $project: { _id: 0, total: 1 } },
      ]);
      return result[0]?.total || 0;
    };

    const [
      totalStockValue,
      totalCustomerPayables,
      totalCustomerReceivables,
      totalEmployeePayables,
      totalEmployeeReceivables,
      totalSupplierPayables,
      totalSupplierReceivables,
    ] = await Promise.all([
      getStockValue(),
      getAggregateSum(CustomerAccount, "balance", { balance: { $lt: 0 } }),
      getAggregateSum(CustomerAccount, "balance", { balance: { $gt: 0 } }),
      getAggregateSum(EmployeeAccount, "balance", { balance: { $gt: 0 } }),
      getAggregateSum(EmployeeAccount, "balance", { balance: { $lt: 0 } }),
      getAggregateSum(SupplierAccount, "balance", { balance: { $gt: 0 } }),
      getAggregateSum(SupplierAccount, "balance", { balance: { $lt: 0 } }),

    ]);
    const totalCapital =
      totalStockValue +
      totalCustomerPayables +
      totalCustomerReceivables +
      totalEmployeePayables +
      totalEmployeeReceivables +
      totalSupplierPayables +
      totalSupplierReceivables;

    res.status(200).json({
      totalStockValue,
      totalCustomerPayables,
      totalCustomerReceivables,
      totalEmployeePayables,
      totalEmployeeReceivables,
      totalSupplierPayables,
      totalSupplierReceivables,
      totalCapital,
    });
  } catch (error) {
    console.error("Error fetching business capital:", error);
    res.status(500).json({ message: "Server error while fetching business capital." });
  }
});


export default router;
