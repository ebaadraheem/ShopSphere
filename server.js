import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import productsRouter from "./routes/productsection/products.js";
import categoryRoutes from "./routes/productsection/categories.js";
import uomRoutes from "./routes/productsection/uoms.js";
import customersRouter from "./routes/peoplesection/customers.js";
import employeeRoutes from "./routes/peoplesection/employees.js";
import supplierRoutes from "./routes/peoplesection/suppliers.js";
import transactionsRouter from "./routes/salesection/transactions.js";
import heldInvoicesRouter from "./routes/held-invoices.js";
import dashboardRouter from "./routes/dashboard.js";
import userRoutes from "./routes/systemusersection/users.js";
import rolesRouter from "./routes/systemusersection/roles.js";
import purchaseRoutes from "./routes/purchasesection/purchase.js";
import purchaseReturnRoutes from "./routes/purchasesection/purchaseReturn.js";
import saleReturnRoutes from "./routes/salesection/saleReturn.js";
import supplierAccountRoutes from "./routes/accountsection/supplierAccount.js";
import customerAccountRoutes from "./routes/accountsection/customerAccount.js";
import expenseCategoryRoutes from "./routes/expensesection/expensecategory.js";
import ExpenseRoutes from "./routes/expensesection/expense.js";
import AttendanceRoutes from "./routes/attendance.js";
import employeeAccountRoutes from "./routes/accountsection/employeeAccount.js";
import employeeSalaryRoutes from "./routes/accountsection/employeeSalary.js";
import businessRoutes from "./routes/variables.js";
import areaCategoryRoutes from "./routes/areas.js";
import typesCategoryRoutes from "./routes/types.js";
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

// --- Core Middleware ---
app.use(cors());
app.use(bodyParser.json());
// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/products", productsRouter);
app.use("/api/categories", categoryRoutes);
app.use("/api/uoms", uomRoutes);
app.use("/api/customers", customersRouter);
app.use("/api/employees", employeeRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/transactions", transactionsRouter);
app.use("/api/held-invoices", heldInvoicesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/users", userRoutes);
app.use("/api/roles", rolesRouter);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/purchase-returns", purchaseReturnRoutes);
app.use("/api/sale-return", saleReturnRoutes);
app.use("/api/supplier-accounts", supplierAccountRoutes);
app.use("/api/customer-accounts", customerAccountRoutes);
app.use("/api/employee-accounts", employeeAccountRoutes);
app.use("/api/expense-category", expenseCategoryRoutes);
app.use("/api/area-category", areaCategoryRoutes);
app.use("/api/types-category", typesCategoryRoutes);
app.use("/api/expenses", ExpenseRoutes);
app.use("/api/attendance", AttendanceRoutes);
app.use("/api/employee-salaries", employeeSalaryRoutes);
app.use("/api/business", businessRoutes);

// --- Public Welcome Route ---
app.get("/", (req, res) => {
  res.send("Welcome to the SnapMart API.");
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
