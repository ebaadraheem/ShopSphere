import express from "express";
import { Employee } from "../../schemas/peopleSchema.js";
import { EmployeeAccount } from "../../schemas/peopleSchema.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const search = req.query.search;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { role: { $regex: search, $options: "i" } },
        ],
      };
    }
    const employees = await Employee.find(query).populate("areaId", "name");
    res.json(employees);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  const {
    name,
    fatherName,
    email,
    phone,
    cnic,
    address,
    salary,
    hireDate,
    contactperson1,
    contactperson2,
    areaId,
  } = req.body;
  if (!name || !phone || !address) {
    return res
      .status(400)
      .json({ message: "Employee name, phone, and address are required." });
  }
  // if (!areaId) {
  //   areaId = null;
  // }


  try {
    const newEmployee = new Employee({
      name,
      fatherName,
      email,
      phone,
      cnic,
      address,
      salary,
      hireDate,
      contactperson1,
      contactperson2,
      areaId,
    });
    await newEmployee.save();
    const newEmployeeAccount = new EmployeeAccount({
      employee: newEmployee._id,
      totalAmount: 0,
    });
    await newEmployeeAccount.save();

    res.status(201).json(newEmployee);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (Employee POST):", err);
      let errorMessage = "An employee with the same ";
      if (err.keyPattern.email) errorMessage += "email, ";
      if (err.keyPattern.phone) errorMessage += "phone, ";
      if (err.keyPattern.cnic) errorMessage += "CNIC, ";
      errorMessage = errorMessage.slice(0, -2) + " already exists.";

      return res.status(400).json({ message: errorMessage });
    }
    console.error("Error adding employee:", err);
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    fatherName,
    email,
    phone,
    cnic,
    address,
    role,
    salary,
    hireDate,
    contactperson1,
    contactperson2,
    areaId,
  } = req.body;

  try {
    const employee = await Employee.findById(id);
    if (!employee)
      return res.status(404).json({ message: "Employee not found." });

    if (req.body.hasOwnProperty("name")) employee.name = name;
    if (req.body.hasOwnProperty("fatherName")) employee.fatherName = fatherName;
    if (req.body.hasOwnProperty("email")) employee.email = email;
    if (req.body.hasOwnProperty("phone")) employee.phone = phone;
    if (req.body.hasOwnProperty("cnic")) employee.cnic = cnic;
    if (req.body.hasOwnProperty("address")) employee.address = address;
    if (req.body.hasOwnProperty("role")) employee.role = role;
    if (req.body.hasOwnProperty("salary")) employee.salary = salary;
    if (req.body.hasOwnProperty("hireDate")) employee.hireDate = hireDate;
    if (req.body.hasOwnProperty("areaId")) {
      employee.areaId = areaId && areaId.trim() !== "" ? areaId : null;
    }

    if (req.body.hasOwnProperty("contactperson1"))
      employee.contactperson1 = contactperson1;
    if (req.body.hasOwnProperty("contactperson2"))
      employee.contactperson2 = contactperson2;

    await employee.save();
    res.json(employee);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (Employee PUT):", err);
      let errorMessage = "An employee with the same ";
      if (err.keyPattern.email) errorMessage += "email, ";
      if (err.keyPattern.phone) errorMessage += "phone, ";
      if (err.keyPattern.cnic) errorMessage += "CNIC, ";
      errorMessage = errorMessage.slice(0, -2) + " already exists.";
      return res.status(400).json({ message: errorMessage });
    }
    console.error("Error updating employee:", err);
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await Employee.findByIdAndDelete(id);
    if (!result)
      return res.status(404).json({ message: "Employee not found." });
    await EmployeeAccount.findOneAndDelete({ employee: id });
    res.json({ message: "Employee deleted successfully." });
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
