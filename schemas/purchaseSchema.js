import mongoose from "mongoose";
// Schema for individual items within a purchase
const purchaseItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product", // Reference to the Product model
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1, // Quantity must be at least 1
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0, // Purchase price can be 0 (e.g., for free samples)
    },
    total: {
      type: Number,
      required: true,
      min: 0, // Total for this item (quantity * purchasePrice)
    },
  },
  { _id: false }
); 
// Main Purchase Schema
const purchaseSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true, // Invoice numbers must be unique
      trim: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier", // Reference to the Supplier model
      required: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now, // Default to current date
    },
    items: [purchaseItemSchema], // Array of purchase items
    totalAmount: {
      type: Number,
      required: true,
      min: 0, // Total amount for the entire purchase, can be 0 if all items are free
    },
    paidAmount: {
      // Amount paid specifically for this purchase at the time of transaction
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    balance: {
      // Remaining balance for THIS specific purchase
      type: Number,
      required: true,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Pre-save hook to calculate totalAmount and balance before saving the purchase
purchaseSchema.pre("save", function (next) {
  // Calculate totalAmount
  this.totalAmount = this.items.reduce((sum, item) => sum + item.total, 0);

  // Calculate balance for this purchase
  this.balance = this.totalAmount - this.paidAmount;
  next();
});

export const Purchase = mongoose.model("Purchase", purchaseSchema);

// models/PurchaseReturn.js
const purchaseReturnItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  returnedQuantity: {
    type: Number,
    required: true,
    min: 1, // Must return at least one item
  },
  purchasePriceAtReturn: {
    // Price at which it was originally purchased
    type: Number,
    required: true,
    min: 0,
  },
});

const purchaseReturnSchema = new mongoose.Schema(
  {
    returnInvoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    originalPurchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      default: null,
      // required: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    returnDate: {
      type: Date,
      default: Date.now,
    },
    items: [purchaseReturnItemSchema],
    totalReturnAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Pre-save hook to update totalReturnAmount
purchaseReturnSchema.pre("save", function (next) {
  this.totalReturnAmount = this.items.reduce(
    (sum, item) => sum + item.returnedQuantity * item.purchasePriceAtReturn,
    0
  );
  next();
});

export const PurchaseReturn = mongoose.model(
  "PurchaseReturn",
  purchaseReturnSchema
);

