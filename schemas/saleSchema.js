import mongoose from "mongoose";

// models/SaleReturn.js
const saleReturnItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  returnedQuantity: {
    type: Number,
    required: true,
    min: 1, 
  },
  salePriceAtReturn: {
    type: Number,
    required: true,
    min: 0,
  },
});

const saleReturnSchema = new mongoose.Schema(
  {
    returnInvoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    originalSale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      required: false,
    },
    returnDate: {
      type: Date,
      default: Date.now,
    },
    items: [saleReturnItemSchema],
    totalReturnAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    profit: {
      type: Number,
      default: 0, 
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, 
  }
);

saleReturnSchema.pre("save", function (next) {
  this.totalReturnAmount = this.items.reduce(
    (sum, item) => sum + item.returnedQuantity * item.salePriceAtReturn,
    0
  );
  next();
});

export const SaleReturn = mongoose.model("SaleReturn", saleReturnSchema);
