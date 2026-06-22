import express from "express";
import { Supplier } from "../../schemas/peopleSchema.js";
import { SupplierAccount } from "../../schemas/peopleSchema.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const search = req.query.search;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { companyName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { address: { $regex: search, $options: "i" } },
          { website: { $regex: search, $options: "i" } },
        ],
      };
    }
    const suppliers = await Supplier.find(query).populate("areaId", "name");
    res.json(suppliers);
  } catch (err) {
    console.error("Error fetching suppliers:", err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  const {
    name,
    companyName,
    email,
    phone,
    address,
    website,
    paymentTerms,
    cnic,
    role,
    areaId,
    contactperson1,
    contactperson2,
  } = req.body;

  if (!name || !companyName || !phone || !address) {
    return res.status(400).json({
      message:
        "Supplier contact name, company name, phone, and address are required.",
    });
  }
  // if (!areaId) {
  //   areaId = null;
  // }

  try {
    const newSupplier = new Supplier({
      name,
      companyName,
      email,
      phone,
      address,
      cnic,
      role,
      website,
      paymentTerms,
      areaId,
      contactperson1,
      contactperson2,
    });
    await newSupplier.save();
    const newSupplierAccount = new SupplierAccount({
      supplier: newSupplier._id,
      totalAmount: 0,
      paidAmount: 0,
      balance: 0,
    });
    await newSupplierAccount.save();
    res.status(201).json(newSupplier);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (Supplier POST):", err);
      let errorMessage = "A supplier with the same ";
      if (err.keyPattern.companyName) errorMessage += "company name, ";
      if (err.keyPattern.email) errorMessage += "email, ";
      if (err.keyPattern.phone) errorMessage += "phone, ";
      if (err.keyPattern.cnic) errorMessage += "CNIC, ";
      errorMessage = errorMessage.slice(0, -2) + " already exists.";
      return res.status(400).json({ message: errorMessage });
    }
    console.error("Error adding supplier:", err);
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    companyName,
    email,
    phone,
    role,
    address,
    cnic,
    website,
    paymentTerms,
    contactperson1,
    areaId,
    contactperson2,
  } = req.body;

  try {
    const supplier = await Supplier.findById(id);
    if (!supplier)
      return res.status(404).json({ message: "Supplier not found." });

    if (req.body.hasOwnProperty("name")) supplier.name = name;
    if (req.body.hasOwnProperty("companyName"))
      supplier.companyName = companyName;
    if (req.body.hasOwnProperty("email")) supplier.email = email;
    if (req.body.hasOwnProperty("phone")) supplier.phone = phone;
    if (req.body.hasOwnProperty("address")) supplier.address = address;
    if (req.body.hasOwnProperty("cnic")) supplier.cnic = cnic;
    if (req.body.hasOwnProperty("website")) supplier.website = website;
    if (req.body.hasOwnProperty("role")) supplier.role = role;
    if (req.body.hasOwnProperty("areaId")) {
      supplier.areaId = areaId && areaId.trim() !== "" ? areaId : null;
    }

    if (req.body.hasOwnProperty("paymentTerms"))
      supplier.paymentTerms = paymentTerms;
    if (req.body.hasOwnProperty("contactperson1"))
      supplier.contactperson1 = contactperson1;
    if (req.body.hasOwnProperty("contactperson2"))
      supplier.contactperson2 = contactperson2;

    await supplier.save();
    res.json(supplier);
  } catch (err) {
    if (err.code === 11000) {
      console.error("Duplicate key error (Supplier PUT):", err);
      let errorMessage = "A supplier with the same ";
      if (err.keyPattern.companyName) errorMessage += "company name, ";
      if (err.keyPattern.email) errorMessage += "email, ";
      if (err.keyPattern.phone) errorMessage += "phone, ";
      if (err.keyPattern.cnic) errorMessage += "CNIC, ";
      errorMessage = errorMessage.slice(0, -2) + " already exists.";
      return res.status(400).json({ message: errorMessage });
    }
    console.error("Error updating supplier:", err);
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await Supplier.findByIdAndDelete(id);

    if (!result)
      return res.status(404).json({ message: "Supplier not found." });
    await SupplierAccount.findOneAndDelete({ supplier: id });
    res.json({ message: "Supplier deleted successfully." });
  } catch (err) {
    console.error("Error deleting supplier:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
