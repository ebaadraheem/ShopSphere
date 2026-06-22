import mongoose from "mongoose";

// Category Schema
const ExpenseCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
  }
);
export const ExpenseCategory = mongoose.model(
  "ExpenseCategory",
  ExpenseCategorySchema
);
// Expense Schema
const ExpenseSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: true,
    },
    amount: { type: Number, required: true },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    description: { type: String, required: true },
    date: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);
export const Expense = mongoose.model("Expense", ExpenseSchema);
