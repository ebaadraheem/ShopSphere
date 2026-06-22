import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer middleware
const upload = multer({ dest: "uploads/" });

// Upload image to S3
const uploadImage = async (file) => {
  const fileStream = fs.createReadStream(file.path);
  const fileName = `${Date.now()}-${file.originalname}`;

  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: fileStream,
    ContentType: file.mimetype,
  };

  await s3.send(new PutObjectCommand(uploadParams));

  // Delete local file after upload
  fs.unlinkSync(file.path);

  return getImageUrl(fileName);
};

// Generate public image URL
const getImageUrl = (blobName) => {
  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${blobName}`;
};

// Delete image from S3
const deleteImage = async (blobName) => {
  const deleteParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: blobName,
  };

  await s3.send(new DeleteObjectCommand(deleteParams));
};

export { upload, uploadImage, deleteImage, getImageUrl };
