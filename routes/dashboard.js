// routes/dashboard.js
import express from "express";
import { Transaction } from "../schemas/general.js";
import { Customer, Supplier, Employee } from "../schemas/peopleSchema.js";
import { Product } from "../schemas/productSchema.js";
import { Expense } from "../schemas/expenseSchema.js";
import { Purchase } from "../schemas/purchaseSchema.js";

import { startOfDay,endOfDay, subDays } from "date-fns";

const router = express.Router();
router.get("/daily-sales", async (req, res) => {
  try {
    const today = startOfDay(new Date());
    const end = endOfDay(new Date());
    const sevenDaysAgo = subDays(today, 6); // includes today

    const dailySales = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: sevenDaysAgo, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          total: { $sum: "$totalAmount" },
          walkIn: {
            $sum: {
              $cond: [{ $eq: ["$customerId", null] }, "$totalAmount", 0],
            },
          },
          registered: {
            $sum: {
              $cond: [{ $ne: ["$customerId", null] }, "$totalAmount", 0],
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Format response to match frontend keys: date, total, walkIn, registered
    const result = dailySales.map((entry) => ({
      date: entry._id,
      total: entry.total,
      walkIn: entry.walkIn,
      registered: entry.registered,
    }));

    res.json(result);
  } catch (err) {
    console.error("Daily sales error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET monthly sales summary for charts (current year)
router.get("/monthly-sales", async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfCurrentYear = new Date(`${currentYear}-01-01T00:00:00Z`);
    const startOfNextYear = new Date(`${currentYear + 1}-01-01T00:00:00Z`);

    const monthlySales = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: startOfCurrentYear, $lt: startOfNextYear },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$date" }, year: { $year: "$date" } }, // Group by month and year
          totalSales: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }, // Sort by year then month
      },
    ]);

    res.json(
      monthlySales.map((item) => ({
        month: item._id.month,
        totalSales: item.totalSales,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET Details
router.get("/all-details", async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments();
    const totalSuppliers = await Supplier.countDocuments();
    const totalEmployees = await Employee.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalExpenses = await Expense.aggregate([
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$amount" },
        },
      },
    ]);
    const totalPurchases = await Purchase.countDocuments();
    const totalSalesInvoices = await Transaction.countDocuments();
    const totalStock = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalStock: { $sum: "$stock" },
        },
      },
    ]);
    res.json({
      totalCustomers,
      totalSuppliers,
      totalEmployees,
      totalProducts,
      totalExpenses: totalExpenses[0]?.totalExpenses || 0, // Handle case where no expenses exist
      totalPurchases,
      totalSalesInvoices,
      totalStock: totalStock[0]?.totalStock || 0, // Handle case where no products exist
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
