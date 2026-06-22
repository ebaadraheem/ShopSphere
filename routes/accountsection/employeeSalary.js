import express from "express";
import mongoose from "mongoose";
import { Employee, EmployeeAccount } from "../../schemas/peopleSchema.js";
import { Payment, User, SalaryCycle } from "../../schemas/general.js";

const router = express.Router();

// GET all employee salary summary
router.get("/all-summary", async (req, res) => {
  try {
    const employees = await Employee.aggregate([
      {
        $lookup: {
          from: "employeeaccounts",
          localField: "_id",
          foreignField: "employee",
          as: "accountDetails",
        },
      },
      {
        $unwind: {
          path: "$accountDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          cnic: 1,
          phone: 1,
          role: 1,
          salary: 1,
            hireDate: 1,
          totalAmount: "$accountDetails.totalAmount",
          paidAmount: "$accountDetails.paidAmount",
          balance: "$accountDetails.balance",
        },
      },
      { $sort: { name: 1 } },
    ]);

    res.status(200).json(employees);
  } catch (error) {
    console.error("Error fetching all employee salary summaries:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// GET salary cycle history
router.get("/fetch-salary-cycles", async (req, res) => {
  try {
    const salaryCycles = await SalaryCycle.find({}).sort({
      year: -1,
      month: -1,
    });

    res.status(200).json(salaryCycles);
  } catch (error) {
    console.error("Error fetching salary cycle history:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// GET employee + account details
router.get("/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(employeeId))
      return res
        .status(400)
        .json({ message: "Invalid Employee ID format123." });

    const employee = await Employee.findById(employeeId)
      .select("-password")
      .lean();
    if (!employee)
      return res.status(404).json({ message: "Employee not found." });

    let employeeAccount = await EmployeeAccount.findOne({
      employee: employeeId,
    });
    if (!employeeAccount) {
      employeeAccount = new EmployeeAccount({
        employee: employeeId,
        totalAmount: 0,
        paidAmount: 0,
        balance: 0,
      });
      await employeeAccount.save();
    }

    res.status(200).json({ employee, employeeAccount });
  } catch (error) {
    console.error("Error fetching employee salary details:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// PATCH update base salary
router.patch("/:employeeId/base-salary", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { newSalary } = req.body;

    if (!mongoose.Types.ObjectId.isValid(employeeId))
      return res.status(400).json({ message: "Invalid Employee ID format." });
    if (typeof newSalary !== "number" || newSalary < 0)
      return res
        .status(400)
        .json({ message: "New salary must be a non-negative number." });

    const employee = await Employee.findByIdAndUpdate(
      employeeId,
      { salary: newSalary },
      { new: true, runValidators: true }
    ).select("-password");

    if (!employee)
      return res.status(404).json({ message: "Employee not found." });

    res.status(200).json({
      message: "Employee base salary updated successfully.",
      employee,
    });
  } catch (error) {
    console.error("Error updating employee base salary:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// GET paid history
router.get("/:employeeId/paid-history", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(employeeId))
      return res.status(400).json({ message: "Invalid Employee ID format." });

    const employeeAccount = await EmployeeAccount.findOne({
      employee: employeeId,
    });
    if (!employeeAccount) return res.status(200).json([]);

    const query = {
      accountType: "EmployeeAccount",
      account: employeeAccount._id,
    };

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = end;
      }
    }

    const payments = await Payment.find(query).sort({ paymentDate: -1 });
    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching employee paid history:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// POST process salary cycle
router.post("/process-cycle", async (req, res) => {
  console.log("Processing salary cycle...", req.body);
  try {
    const { year, month, processedBy } = req.body;
    if (
      typeof year !== "number" ||
      typeof month !== "number" ||
      month < 1 ||
      month > 12
    ) {
      return res
        .status(400)
        .json({ message: "Valid year and month are required (month 1-12)." });
    }

    const existingCycle = await SalaryCycle.findOne({ year, month });
    if (existingCycle) {
      return res.status(409).json({
        message: `Salary cycle for ${month}/${year} has already been processed.`,
        code: "CYCLE_ALREADY_PROCESSED",
      });
    }
    const employees = await Employee.find({});
    if (!employees.length)
      return res
        .status(404)
        .json({ message: "No employees found to process salaries for." });

    const accountSaves = [];

    for (const employee of employees) {
      const salaryAmount = employee.salary || 0;
      if (salaryAmount <= 0) continue;

      let employeeAccount = await EmployeeAccount.findOne({
        employee: employee._id,
      });
      if (!employeeAccount) {
        employeeAccount = new EmployeeAccount({
          employee: employee._id,
          totalAmount: 0,
          paidAmount: 0,
          balance: 0,
        });
      }

      employeeAccount.totalAmount += salaryAmount;
      accountSaves.push(employeeAccount.save());
    }

    const processedByUser = await User.findOne({
      firebaseUid: processedBy,
    }).select("_id");
    await Promise.all([...accountSaves]);

    const newCycle = new SalaryCycle({
      year,
      month,
      processedBy: processedByUser?._id || null,
      status: "Processed",
    });
    await newCycle.save();

    res.status(201).json({
      message: `Salaries for ${month}/${year} processed successfully for ${employees.length} employees.`,
    });
  } catch (error) {
    console.error("Error processing salary cycle:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

export default router;
