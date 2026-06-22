import mongoose from "mongoose";

// People Schemas
const contactPersonSubSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true }, // Added trim
    phone: { type: String, default: "", trim: true }, // Added trim
  },
  { _id: false }
);

// Customer Schema
const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // Added trim
    fatherName: { type: String, default: "", trim: true }, // Added trim
    email: {
      type: String,
      sparse: true,
      default: "",
      trim: true,
      lowercase: true, // Added lowercase and trim
    },
    phone: { type: String, required: true, trim: true }, // Required, Unique, Added trim
    contactperson1: { type: contactPersonSubSchema, default: {} },
    contactperson2: { type: contactPersonSubSchema, default: {} },
    cnic: { type: String, unique: true, sparse: true, default: "", trim: true },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: "AreaCategory",default: null },
    typeId: { type: mongoose.Schema.Types.ObjectId, ref: "TypesCategory",default: null },
    address: { type: String, required: true, trim: true }, // Required, Added trim
  },
  {
    timestamps: true, // Auto adds createdAt and updatedAt
  }
);

// Indexes for Customer Schema
customerSchema.index({ cnic: 1 }, { unique: true, sparse: true });

export const Customer = mongoose.model("Customer", customerSchema);

const customerAccountSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const CustomerAccount = mongoose.model(
  "CustomerAccount",
  customerAccountSchema
);

// Supplier Schema
const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // Added trim
    companyName: { type: String, required: true, trim: true }, // Required, Unique, Added trim
    email: {
      type: String,
      trim: true,
      lowercase: true, // Required, Unique, Added lowercase and trim
    },
    cnic: { type: String, unique: true, sparse: true, trim: true }, // Optional (sparse), Unique, Added trim
    phone: { type: String, required: true, trim: true }, // Required, Unique, Added trim
    address: { type: String, required: true, trim: true }, // Required, Added trim
    website: { type: String, default: "", trim: true }, // Added trim
    paymentTerms: { type: String, default: "", trim: true }, // Added trim
    contactperson1: { type: contactPersonSubSchema, default: {} },
    contactperson2: { type: contactPersonSubSchema, default: {} },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: "AreaCategory",default: null },
  },
  {
    timestamps: true, // Auto adds createdAt and updatedAt
  }
);

// CORRECTED INDEXES for Supplier Schema (as discussed previously)
supplierSchema.index({ cnic: 1 }, { unique: true, sparse: true });

export const Supplier = mongoose.model("Supplier", supplierSchema);

const supplierAccountSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      unique: true, // Each supplier has one account
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0, // totalAmount - paidAmount (can be negative if overpaid by you)
    },
  },
  {
    timestamps: true, // Track when the account was created/updated
  }
);

// Pre-save hook to calculate balance for SupplierAccount
supplierAccountSchema.pre("save", function (next) {
  this.balance = this.totalAmount - this.paidAmount;
  next();
});

export const SupplierAccount = mongoose.model(
  "SupplierAccount",
  supplierAccountSchema
);

// Employee Schema
const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // Added trim
    fatherName: { type: String, default: "", trim: true }, // Added trim
    email: {
      type: String,
      default: "",
      sparse: true,
      trim: true,
      lowercase: true, // Added unique, sparse, trim, lowercase
    },
    role: { type: String, default: "Employee", trim: true }, // Default role for employees
    phone: { type: String, required: true, trim: true }, // Required, Unique, Added trim
    cnic: { type: String, unique: true, sparse: true, trim: true }, // Optional (sparse), Unique, Added trim
    address: { type: String, required: true, trim: true }, // Required, Added trim
    salary: { type: Number, default: null, min: 0 }, // Specific for Employee: salary (min:0 added)
    hireDate: { type: Date, default: null }, // Specific for Employee: hire date
    contactperson1: { type: contactPersonSubSchema, default: {} },
    contactperson2: { type: contactPersonSubSchema, default: {} },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: "AreaCategory",default: null },
  },
  {
    timestamps: true, // Auto adds createdAt and updatedAt
  }
);

// Indexes for Employee Schema
employeeSchema.index({ cnic: 1 }, { unique: true, sparse: true });

export const Employee = mongoose.model("Employee", employeeSchema);

const employeeAccountSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      unique: true, // Each employee has one account
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0, // totalAmount - paidAmount (can be negative if overpaid by you)
    },
  },
  {
    timestamps: true, // Track when the account was created/updated
  }
);

// Pre-save hook to calculate balance for EmployeeAccount
employeeAccountSchema.pre("save", function (next) {
  this.balance = this.totalAmount - this.paidAmount;
  next();
});

export const EmployeeAccount = mongoose.model(
  "EmployeeAccount",
  employeeAccountSchema
);
