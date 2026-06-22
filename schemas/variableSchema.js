import mongoose from 'mongoose';

const businessVariableSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    urduName: {
        type: String,
        trim: true,
        default: null,
    },
    address: {
        type: String,
        required: true,
        trim: true,
    },
    urduAddress: {
        type: String,
        trim: true,
        default: null,
    },
    contactNo1: {
        type: String,
        required: true,
        trim: true,
    },
    contactNo2: {
        type: String,
        trim: true,
        default: null,
    },
    businessEmail: {
        type: String,
        trim: true,
        default: null,
    },
    logo: {
        type: String, // Path to the logo image
        default: null,
    },
}, { timestamps: true });

export const BusinessVariable = mongoose.model('BusinessVariable', businessVariableSchema);