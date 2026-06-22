import express from "express";
import { ExpenseCategory, Expense } from "../../schemas/expenseSchema.js";
import mongoose from "mongoose";
import { isValid, startOfDay, endOfDay } from "date-fns";
const router = express.Router();

router.get("/expense-details/:categoryId", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { categoryId } = req.params;
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);
    if (!isValid(start) || !isValid(end)) {
      return res.status(400).json({ msg: "Invalid date format provided." });
    }

    const matchStage = {
      date: {
        $gte: startOfDay(start),
        $lte: endOfDay(end),
      },
    };

    if (
      categoryId &&
      categoryId !== "all" &&
      mongoose.Types.ObjectId.isValid(categoryId)
    ) {
      matchStage.category = new mongoose.Types.ObjectId(categoryId);
    }

    const expenses = await Expense.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "expensecategories",
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          title: "$description",
          amount: 1,
          expenseDate: "$date",
          categoryName: { $ifNull: ["$categoryInfo.name", "Uncategorized"] },
        },
      },
      { $sort: { expenseDate: -1 } },
    ]);
    res.json(expenses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

router.get("/summary-by-category", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);
    if (!isValid(start) || !isValid(end)) {
      return res.status(400).json({ msg: "Invalid date format provided." });
    }

    const summary = await Expense.aggregate([
      {
        $match: {
          date: {
            $gte: startOfDay(start),
            $lte: endOfDay(end),
          },
        },
      },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $lookup: {
          from: "expensecategories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          categoryName: { $ifNull: ["$categoryInfo.name", "Uncategorized"] },
          totalAmount: 1,
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);
    res.json(summary);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

router.post("/", async (req, res) => {
  try {
    const { description, amount, category, date, addedBy } = req.body;
    if (!description || !amount || !category || !addedBy) {
      return res.status(400).json({
        message: "Please provide description, amount, category, and addedBy.",
      });
    }

    const categoryExists = await ExpenseCategory.findById(category);
    if (!categoryExists) {
      return res
        .status(404)
        .json({ message: "The specified expense category does not exist." });
    }

    const newExpense = new Expense({
      description,
      amount,
      category,
      date,
      addedBy,
    });

    const savedExpense = await newExpense.save();
    const populatedExpense = await Expense.findById(savedExpense._id).populate(
      "category",
      "name"
    );

    res.status(201).json(populatedExpense);
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const expenses = await Expense.find({})
      .populate("category", "name")
      .populate("addedBy", "name")
      .sort({ date: -1 });

    res.status(200).json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("category", "name")
      .populate("addedBy", "name");
    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }
    res.status(200).json(expense);
  } catch (error) {
    console.error(`Error fetching expense ${req.params.id}:`, error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { description, amount, category, date, addedBy } = req.body;

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }
    expense.description = description || expense.description;
    expense.amount = amount || expense.amount;
    expense.category = category || expense.category;
    expense.date = date || expense.date;
    expense.addedBy = addedBy || expense.addedBy;

    const updatedExpense = await expense.save();
    const populatedExpense = await Expense.findById(updatedExpense._id)
      .populate("category", "name")
      .populate("addedBy", "name");

    res.status(200).json(populatedExpense);
  } catch (error) {
    console.error(`Error updating expense ${req.params.id}:`, error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    await expense.deleteOne();

    res.status(200).json({ message: "Expense deleted successfully." });
  } catch (error) {
    console.error(`Error deleting expense ${req.params.id}:`, error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

export default router;
