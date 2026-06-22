import express from "express";
import { Employee } from "../schemas/peopleSchema.js";
import { Attendance } from "../schemas/general.js";
import mongoose from "mongoose";

const router = express.Router();

const getStartOfDayUTC = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};
const getEndOfDayInUTC = (localDate) => {
  const d = new Date(localDate);
  d.setHours(23, 59, 59, 999);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000);
};

router.get("/", async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    const query = {};

    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      query.employee = employeeId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = getStartOfDayUTC(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const attendances = await Attendance.find(query)
      .populate("employee", "name cnic phone role")
      .sort({ date: -1, "employeeInfo.name": 1 });

    res.status(200).json(attendances);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/mark", async (req, res) => {
  const attendanceRecords = req.body;

  if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
    return res
      .status(400)
      .json({
        message:
          "Request body must be a non-empty array of attendance records.",
      });
  }

  const results = {
    success: [],
    failed: [],
    errors: [],
  };

  for (const record of attendanceRecords) {
    const { employeeId, date, status, clockInTime, clockOutTime } = record;

    // Basic validation for each record
    if (!employeeId || !date || !status) {
      results.failed.push(record);
      results.errors.push(
        `Missing required fields for employeeId: ${employeeId}`
      );
      continue;
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      results.failed.push(record);
      results.errors.push(
        `Invalid Employee ID format for employeeId: ${employeeId}`
      );
      continue;
    }

    const attendanceDate = getStartOfDayUTC(date);

    try {
      const employee = await Employee.findById(employeeId).select("name cnic");
      if (!employee) {
        results.failed.push(record);
        results.errors.push(`Employee not found for employeeId: ${employeeId}`);
        continue;
      }

      const currentClockIn = clockInTime ? new Date(clockInTime) : null;
      const currentClockOut = clockOutTime ? new Date(clockOutTime) : null;

      // Validation: Clock-in must be before clock-out
      if (
        currentClockIn &&
        currentClockOut &&
        currentClockIn >= currentClockOut
      ) {
        results.failed.push(record);
        results.errors.push(
          `Clock-in time must be before clock-out time for employee: ${employee.name}`
        );
        continue;
      }

      // Upsert operation: Find and update, or create if not exists
      const filter = { employee: employeeId, date: attendanceDate };
      const update = {
        status: status,
        clockInTime: currentClockIn,
        clockOutTime: currentClockOut,
        employeeName: employee.name,
        employeeCnic: employee.cnic,
      };
      const options = {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      };

      const markedAttendance = await Attendance.findOneAndUpdate(
        filter,
        update,
        options
      );
      results.success.push(markedAttendance);
    } catch (error) {
      console.error(
        `Error marking attendance for employee ${employeeId}:`,
        error
      );
      if (error.code === 11000) {
        results.failed.push(record);
        results.errors.push(
          `Duplicate attendance for employee ${employeeId} on ${date}.`
        );
      } else {
        results.failed.push(record);
        results.errors.push(
          `Failed to process attendance for employee ${employeeId}: ${error.message}`
        );
      }
    }
  }

  if (results.failed.length > 0) {
    return res.status(200).json({
      message: `Processed ${attendanceRecords.length} records. ${results.success.length} succeeded, ${results.failed.length} failed.`,
      results: results,
    });
  } else {
    res.status(201).json({
      message: `Successfully marked attendance for ${results.success.length} employees.`,
      results: results,
    });
  }
});

router.get("/attendance-report", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate) {
       const start = getStartOfDayUTC(startDate);
      query.date = { $gte: start }; // Use $gte for start date
    }
    if (endDate) {
      const end = getEndOfDayInUTC(endDate);
      query.date = { ...query.date, $lte: end };
    }
    if (!query.date) {
      return res
        .status(400)
        .json({ message: "Please provide a valid date range." });
    }
    const attendances = await Attendance.find(query)
      .populate("employee", "name cnic phone role")
      .sort({ date: 1, "employeeInfo.name": 1 });
    res.status(200).json(attendances);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { status, clockInTime, clockOutTime } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ message: "Invalid Attendance Record ID format." });
  }

  try {
    const attendanceRecord = await Attendance.findById(id);
    if (!attendanceRecord) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    const updatedClockIn = clockInTime ? new Date(clockInTime) : null;
    const updatedClockOut = clockOutTime ? new Date(clockOutTime) : null;

    if (
      updatedClockIn &&
      updatedClockOut &&
      updatedClockIn >= updatedClockOut
    ) {
      return res
        .status(400)
        .json({ message: "Clock-in time must be before clock-out time." });
    }

    attendanceRecord.status = status || attendanceRecord.status; // Update if provided
    attendanceRecord.clockInTime = updatedClockIn;
    attendanceRecord.clockOutTime = updatedClockOut;

    await attendanceRecord.save();
    res.status(200).json(attendanceRecord);
  } catch (error) {
    console.error("Error updating attendance record:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Invalid Attendance Record ID format." });
    }
    const result = await Attendance.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: "Attendance record not found." });
    }
    res
      .status(200)
      .json({ message: "Attendance record deleted successfully." });
  } catch (error) {
    console.error("Error deleting attendance record:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

export default router;
