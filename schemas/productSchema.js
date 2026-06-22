import mongoose from 'mongoose';

// Product Schema (keeping stock here for current quantity convenience)
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    costprice: {
        type: Number,
        required: false,
        min: 0.00,
    },
    saleprice: {
        type: Number,
        required: false,
        min: 0.00,
    },
    stock: { // Keep stock here for quick access to current quantity
        type: Number,
        required: false,
        min: 0,
        default: 0
    },
    expiryDate: {
        type: Date,
        required: false,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    uom: { // Unit of Measure
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UOM',
        required: true
    },
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

productSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

export const Product = mongoose.model('Product', productSchema);

// Category Schema
const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
}, {
    timestamps: true // Good to have timestamps here too
});

categorySchema.index({ name: 1 }, { unique: true });
export const Category = mongoose.model('Category', categorySchema);

// UOM Schema (Unit of Measure)
const uomSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
}, {
    timestamps: true // Good to have timestamps here too
});

uomSchema.index({ name: 1 }, { unique: true });
export const UOM = mongoose.model('UOM', uomSchema);


// NEW: Stock Transaction Schema
const stockTransactionSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0 
    },
    type: {
        type: String,
        enum: ['StockIn', 'StockOut', 'Adjustment'], // Define types of stock movements
        required: true
    },
    // Reference to the source document (e.g., Purchase, Sale, Inventory Adjustment)
    reference: {
        type: mongoose.Schema.Types.ObjectId,
        required: true, // Reference to the document that caused this stock change
        refPath: 'referenceModel' // Dynamic reference based on referenceModel field
    },
    referenceModel: {
        type: String,
        required: true,
        enum: ['Purchase', 'Sale', 'InventoryAdjustment',"PurchaseReturn","SaleReturn"] // Models that can cause stock changes
    },
    notes: {
        type: String,
        trim: true
    },
    transactionDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Adds createdAt and updatedAt for the transaction record
});

// Index for efficient querying by product or reference
stockTransactionSchema.index({ product: 1, transactionDate: -1 });
stockTransactionSchema.index({ reference: 1, referenceModel: 1 });

export const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);

