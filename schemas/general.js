import mongoose from "mongoose";
import { format } from "date-fns";

// --- Utility Function ---
function formatDateToYYYYMMDD(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
}

// Transaction Schema (Completed Sales)
const transactionSchema = new mongoose.Schema({
  receiptId: { type: String, unique: true },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      name: String,
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
    },
  ],
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    default: null,
  },
  customerName: { type: String, default: "Walk-in Customer" },
  totalAmount: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  profit: { type: Number, default: 0 }, // Profit field
  paidAmount: { type: Number, required: true },
  balance: { type: Number, required: true },
  employeeId: { type: String, required: true },
  date: { type: Date, default: Date.now },
});
transactionSchema.pre("save", function (next) {
  if (this.isNew) {
    const today = format(new Date(), "yyyyMMdd");
    const uniqueSuffix = this._id.toString().slice(-4);
    this.receiptId = `TXN-${today}-${uniqueSuffix.toUpperCase()}`;
  }
  next();
});

export const Transaction = mongoose.model("Transaction", transactionSchema);

// Held Invoice Schema
const heldInvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      name: String,
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
    },
  ],
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    default: null,
  },
  customerName: { type: String, default: "Walk-in Customer" },
  totalAmount: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  employeeId: { type: String, required: true },
  date: { type: Date, default: Date.now },
});
heldInvoiceSchema.pre("save", async function (next) {
  if (this.isNew) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await this.constructor.countDocuments({
      date: { $gte: today, $lt: tomorrow },
    });
    this.invoiceNumber = `HOLD-${formatDateToYYYYMMDD(new Date())}-${(count + 1)
      .toString()
      .padStart(3, "0")}`;
  }
  next();
});
export const HeldInvoice = mongoose.model("HeldInvoice", heldInvoiceSchema);

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  accesses: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Role = mongoose.model("Role", roleSchema);

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  accesses: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const SchemaOfRole = mongoose.model("SchemaOfRole", RoleSchema);

// Attendance Schema
const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
      set: function (val) {
        if (val) {
          const d = new Date(val);
          d.setUTCHours(0, 0, 0, 0);
          return d;
        }
        return val;
      },
    },
    clockInTime: {
      type: Date,
      default: null,
    },
    clockOutTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Leave"],
      required: true,
      default: "Present",
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model("Attendance", attendanceSchema);

const paymentSchema = new mongoose.Schema(
  {
    accountType: {
      type: String,
      required: true,
      enum: ["SupplierAccount", "CustomerAccount", "EmployeeAccount"], // Enum specifies which collections it can reference
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "accountType", // This tells Mongoose to use the value of 'accountType' field as the model name for 'ref'
    },

    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Cash", "Check", "Online"], 
    },
    paymentDate: {
      type: Date,
      default: Date.now, // Defaults to the current date/time
    },
    referenceNumber: {
      type: String,
      trim: true,
      required: function () {
        return this.paymentMethod !== "Cash";
      },
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

export const Payment = mongoose.model("Payment", paymentSchema);

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchemaOfRole",
    },
    cnic: {
      type: String,
      required: true,
      unique: true,
    },
    contactNo: {
      type: String,
      required: true,
    },
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);


const salaryCycleSchema = new mongoose.Schema({
    year: {
        type: Number,
        required: true,
        min: 2000, 
    },
    month: {
        type: Number,
        required: true,
        min: 1, // January
        max: 12, // December
    },
    processedAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee', // Assuming an Employee model for the user who processed it
        default: null,
    },
    status: {
        type: String,
        enum: ['Pending', 'Processed', 'Partial'], // Or simpler 'Processed' / 'Not Processed'
        default: 'Processed', 
    },
    notes: {
        type: String,
        trim: true,
        default: '',
    },
}, { timestamps: true });


salaryCycleSchema.index({ year: 1, month: 1 }, { unique: true });

export const SalaryCycle = mongoose.model('SalaryCycle', salaryCycleSchema);

// Category Schema
const AreaCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
  }
);
export const AreaCategory = mongoose.model(
  "AreaCategory",
  AreaCategorySchema
);

// Category Schema
const TypesCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
  }
);
export const TypesCategory = mongoose.model(
  "TypesCategory",
  TypesCategorySchema
);

