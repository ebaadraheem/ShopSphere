import express from 'express';
import { BusinessVariable } from '../schemas/variableSchema.js';
import mongoose from 'mongoose';
import upload from '../lib/multer.js';
import { BlobServiceClient } from "@azure/storage-blob";
import path from "path";
import 'dotenv/config'; 

const router = express.Router();

// Initialize the Blob Service Client 
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_CONTAINER_NAME;

if (!connectionString || !containerName) {
    console.error("Missing Azure Storage credentials in environment variables.");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

// Function to upload the file to Azure Blob Storage
const uploadToAzure = async (file) => {
    const blobName = `${Date.now()}${path.extname(file.originalname)}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
   const uploadResponse = await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: {
            blobContentType: file.mimetype,
        },
        metadata: {
            optimized: "false",  
            uploadedBy: "express-api", 
        },
    });
    const logoUrl = blockBlobClient.url;
    console.log("Uploaded image to azure ",uploadResponse);
    
    return logoUrl;
};

router.get('/', async (req, res) => {
    try {
        const businessDetails = await BusinessVariable.findOne({});
        res.status(200).json(businessDetails);
    } catch (error) {
        console.error("Error fetching business details:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const existingDetails = await BusinessVariable.findOne({});
        if (existingDetails) {
            return res.status(409).json({ message: "Business details already exist. Use the PATCH route to update." });
        }

        const newBusinessDetails = new BusinessVariable(req.body);
        await newBusinessDetails.save();
        res.status(201).json(newBusinessDetails);
    } catch (error) {
        console.error("Error creating business details:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid Business ID format." });
        }
        const updatedDetails = await BusinessVariable.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedDetails) {
            return res.status(404).json({ message: "Business details not found." });
        }
        res.status(200).json(updatedDetails);
    } catch (error) {
        console.error("Error updating business details:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid Business ID format." });
        }

        const deletedDetails = await BusinessVariable.findByIdAndDelete(id);
        if (!deletedDetails) {
            return res.status(404).json({ message: "Business details not found." });
        }
        res.status(200).json({ message: "Business details deleted successfully." });
    } catch (error) {
        console.error("Error deleting business details:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

router.post('/upload-logo', (req, res) => {
    upload(req, res, async (err) => { 
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }
        try {
            const logoUrl = await uploadToAzure(req.file);
            res.status(200).json({ logoUrl });
        } catch (azureError) {
            console.error("Azure Blob Upload Error:", azureError);
            return res.status(500).json({ message: "Failed to upload file to Azure." });
        }
    });
});

export default router;