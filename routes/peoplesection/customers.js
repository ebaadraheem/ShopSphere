import express from "express";
import { Customer } from "../../schemas/peopleSchema.js";
import { CustomerAccount } from "../../schemas/peopleSchema.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const search = req.query.search;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { address: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }
    const customers = await Customer.find(query)
      .populate("areaId", "name")
      .populate("typeId", "name");
    res.json(customers);
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  const {
    name,
    fatherName,
    email,
    phone,
    contactperson1,
    contactperson2,
    cnic,
    address,
    areaId,
    typeId,
  } = req.body;

  if (!name || !phone || !address) {
    return res
      .status(400)
      .json({ message: "Customer name, phone, and address are required." });
  }
  // if (!areaId ) {
  //   areaId = null;
  // }
  // if (!typeId) {
  //   typeId = null;
  // }

  try {
    const newCustomer = new Customer({
      name,
      fatherName,
      email,
      phone,
      contactperson1,
      contactperson2,
      cnic,
      address,
      areaId,
      typeId,
    });
    await newCustomer.save();
    const newCustomerAccount = new CustomerAccount({
      customer: newCustomer._id,
      totalAmount: 0,
      paidAmount: 0,
      balance: 0,
    });
    await newCustomerAccount.save();
    res.status(201).json(newCustomer);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (Customer POST):", err);
      let errorMessage = "A customer with the same ";
      if (err.keyPattern.email) errorMessage += "email, ";
      if (err.keyPattern.phone) errorMessage += "phone, ";
      if (err.keyPattern.cnic) errorMessage += "CNIC, ";
      errorMessage = errorMessage.slice(0, -2) + " already exists.";
      return res.status(400).json({ message: errorMessage });
    }
    console.error("Error adding customer:", err);
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
    contactperson1,
    contactperson2,
    cnic,
    address,
    areaId,
    typeId,
  } = req.body;

  try {
    const customer = await Customer.findById(id);
    if (!customer)
      return res.status(404).json({ message: "Customer not found." });

    if (req.body.hasOwnProperty("name")) customer.name = name;
    if (req.body.hasOwnProperty("fatherName")) customer.fatherName = fatherName;
    if (req.body.hasOwnProperty("email")) customer.email = email;
    if (req.body.hasOwnProperty("phone")) customer.phone = phone;
    if (req.body.hasOwnProperty("contactperson1"))
      customer.contactperson1 = contactperson1;
    if (req.body.hasOwnProperty("contactperson2"))
      customer.contactperson2 = contactperson2;
    if (req.body.hasOwnProperty("cnic")) customer.cnic = cnic;
    if (req.body.hasOwnProperty("address")) customer.address = address;
    if (req.body.hasOwnProperty("areaId")) {
      customer.areaId = areaId && areaId.trim() !== "" ? areaId : null;
    }

    if (req.body.hasOwnProperty("typeId")) {
      customer.typeId = typeId && typeId.trim() !== "" ? typeId : null;
    }

    await customer.save();
    res.json(customer);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (Customer PUT):", err);
      let errorMessage = "A customer with the same ";
      if (err.keyPattern.email) errorMessage += "email, ";
      if (err.keyPattern.phone) errorMessage += "phone, ";
      if (err.keyPattern.cnic) errorMessage += "CNIC, ";
      errorMessage = errorMessage.slice(0, -2) + " already exists.";
      return res.status(400).json({ message: errorMessage });
    }
    console.error("Error updating customer:", err);
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await Customer.findByIdAndDelete(id);
    if (!result)
      return res.status(404).json({ message: "Customer not found." });
    await CustomerAccount.findOneAndDelete({ customer: id });
    res.json({ message: "Customer deleted successfully." });
  } catch (err) {
    console.error("Error deleting customer:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
