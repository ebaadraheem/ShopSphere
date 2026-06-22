import express from 'express';
import { HeldInvoice } from '../schemas/general.js'; // Adjust the import path as necessary

const router = express.Router();

// POST a new held invoice
router.post('/', async (req, res) => {
  const { products, customerId, customerName, totalAmount, discount,employeeId } = req.body;
  if (!products || products.length === 0 || totalAmount === undefined) {
    return res.status(400).json({ message: 'Missing required held invoice fields.' });
  }
  try {
    const newHeldInvoice = new HeldInvoice({
      products,
      customerId,
      customerName,
      totalAmount,
      discount,
      employeeId: employeeId || 'unknown', // fallback if uid is undefined
    });
    await newHeldInvoice.save();
    res.status(201).json(newHeldInvoice);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Held invoice already exists.' });
    }
    res.status(500).json({ message: err.message });
  }
});

// GET all held invoices (optionally filter by ?employeeId=XYZ)
router.get('/', async (req, res) => {
  try {
    const query = {};

    if (
      typeof req.query.employeeId === 'string' &&
      req.query.employeeId.trim() !== '' &&
      req.query.employeeId !== 'null' &&
      req.query.employeeId !== 'undefined'
    ) {
      query.employeeId = req.query.employeeId;
    }

    const heldInvoices = await HeldInvoice.find(query).sort({ date: -1 });
    res.status(200).json(heldInvoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// GET all held invoices for a specific employeeId (as route param)
router.get('/:employeeId', async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    if (!employeeId || employeeId === 'null' || employeeId === 'undefined') {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    const heldInvoices = await HeldInvoice.find({ employeeId }).sort({ date: -1 });

    res.status(200).json(heldInvoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// DELETE a held invoice by ID
router.delete('/:id', async (req, res) => {
  try {
    console.log("Deleting held invoice with ID:", req.params.id);
    const result = await HeldInvoice.findById(req.params.id);
    if (!result) return res.status(404).json({ message: 'Held invoice not found.' });

    await HeldInvoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Held invoice deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/by-id/:id', async (req, res) => {
  try {
    const invoice = await HeldInvoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    res.status(200).json(invoice); // ✅ send object, not array
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
