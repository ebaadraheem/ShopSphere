import multer from "multer";
import path from "path";

// Use memoryStorage to hold the file buffer before uploading to Azure
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit remains
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(
            path.extname(file.originalname).toLowerCase()
        );

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(
            new Error(
                "Error: File upload only supports the following filetypes - " +
                filetypes
            )
        );
    },
}).single("logo");

export default upload;