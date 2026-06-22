// src/routes/employeeRoutes.js
import express from "express";
import { Employee, EmployeeAccount } from "../../schemas/peopleSchema.js";
import { Payment } from "../../schemas/general.js";
import mongoose from "mongoose";
const router = express.Router();

// Get all employees with accounts
router.get("/with-accounts", async (req, res) => {
  try {
    const employees = await Employee.aggregate([
      {
        $lookup: {
          from: "employeeaccounts", // The collection name for EmployeeAccount
          localField: "_id",
          foreignField: "employee",
          as: "employeeAccount",
        },
      },
      {
        $unwind: {
          path: "$employeeAccount",
          preserveNullAndEmptyArrays: true, // Keep employees even if no account exists
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          phone: 1,
          address: 1,
          role: 1, // Example employee-specific field
          hireDate: 1,
          cnic: 1,
          "employeeAccount.totalAmount": 1,
          "employeeAccount.paidAmount": 1,
          "employeeAccount.balance": 1,
          "employeeAccount._id": 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);
    res.status(200).json(employees);
  } catch (error) {
    console.error("Error fetching all employees with accounts:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Get a single employee's account
router.get("/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const employeeAccount = await EmployeeAccount.findOne({
      employee: employeeId,
    }).populate("employee"); // Populate the actual employee object

    if (!employeeAccount) {
      return res.status(404).json({ message: "Employee account not found" });
    }

    res.status(200).json(employeeAccount);
  } catch (error) {
    console.error("Error fetching employee account:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Add a new employee
router.post("/", async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    role, // Example employee-specific field
    dateHired, // Example employee-specific field
    // Add other employee-specific fields here
  } = req.body;

  try {
    const newEmployee = new Employee({
      name,
      email,
      phone,
      address,
      role,
      dateHired,
      // Assign other fields
    });

    await newEmployee.save();
    const newEmployeeAccount = new EmployeeAccount({
      employee: newEmployee._id,
      totalAmount: 0,
      paidAmount: 0,
      balance: 0,
    });
    await newEmployeeAccount.save();

    res
      .status(201)
      .json({ employee: newEmployee, employeeAccount: newEmployeeAccount });
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/:employeeId/payments", async (req, res) => {
  try {
    const { employeeId } = req.params;
    let { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const employeeAccount = await EmployeeAccount.findOne({
      employee: employeeId,
    });

    if (!employeeAccount) {
      return res.status(200).json([]); // Return empty array if no account exists
    }

    const query = { account: employeeAccount._id };

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
      .populate("account", "employee") // Populate employee field in account
      .sort({ paymentDate: -1 }); // Sort by payment date, most recent first

    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching payments for employee:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/:employeeId/payments", async (req, res) => {
  const { employeeId } = req.params;
  const { amount, paymentMethod, referenceNumber, notes } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const employeeAccount = await EmployeeAccount.findOne({
      employee: employeeId,
    });

    if (!employeeAccount) {
      return res.status(404).json({ message: "Employee account not found" });
    }

    if (paymentMethod !== "Cash" && !referenceNumber) {
      return res.status(400).json({
        message: "Reference number is required for non-cash payments.",
      });
    }
    const newPayment = new Payment({
      accountType: "EmployeeAccount", // Specify the account type
      account: employeeAccount._id, // Reference to the employee account
      amount,
      paymentMethod,
      referenceNumber,
      notes,
      paymentDate: new Date(),
    });

    await newPayment.save();

    employeeAccount.paidAmount += amount;
    employeeAccount.balance =
      employeeAccount.totalAmount - employeeAccount.paidAmount;

    await employeeAccount.save();

    res.status(201).json(newPayment);
  } catch (error) {
    console.error("Error adding payment to employee:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Delete an employee
router.delete("/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const employeeAccount = await EmployeeAccount.findOneAndDelete({
      employee: employeeId,
    });

    if (employeeAccount) {
      await Payment.deleteMany({ employeeAccount: employeeAccount._id });
    }

    await Employee.findByIdAndDelete(employeeId);

    res
      .status(200)
      .json({ message: "Employee and associated data deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/employee/payables", async (req, res) => {
  try {
    const employees = await Employee.aggregate([
      {
        $lookup: {
          from: "employeeaccounts",
          localField: "_id",
          foreignField: "employee",
          as: "employeeAccount",
        },
      },
      {
        $unwind: "$employeeAccount", // Only include employees with an account
      },
      {
        $match: {
          "employeeAccount.balance": { $gt: 0 }, // Filter for balances greater than 0
        },
      },
      {
        // Project the employee details and the nested account
        $project: {
          _id: 1,
          name: 1,
          phone: 1,
          role: 1,
          balance: "$employeeAccount.balance",
        },
      },
    ]);
    res.status(200).json(employees);
  } catch (error) {
    console.error("Error fetching employee payables:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/employee/receivables", async (req, res) => {
  try {
    const employees = await Employee.aggregate([
      {
        $lookup: {
          from: "employeeaccounts",
          localField: "_id",
          foreignField: "employee",
          as: "employeeAccount",
        },
      },
      {
        $unwind: "$employeeAccount",
      },
      {
        $match: {
          "employeeAccount.balance": { $lt: 0 }, // Filter for balances less than 0
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          phone: 1,
          role: 1,
          balance: "$employeeAccount.balance",
        },
      },
    ]);
    res.status(200).json(employees);
  } catch (error) {
    console.error("Error fetching employee receivables:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

export default router;
