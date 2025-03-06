import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);

// Initialize express app
const app = express();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

// Configure AWS S3
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

// Get CDN URL from environment variable or use a default
const CDN_URL = process.env.CDN_URL;

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Authentication middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Implement your token verification logic here
    // For demo purposes, we're just checking if the token exists
    if (token === 'YOUR_JWT_TOKEN') {
        next();
    } else {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

// Routes
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.post('/upload', authenticate, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type if needed
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'File type not allowed' });
    }

    // Create a unique filename to prevent overwrites
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;

    // Organize files by type in different folders
    let folder = 'misc';
    if (req.file.mimetype.startsWith('image/')) {
        folder = 'images';
    } else if (req.file.mimetype === 'application/pdf') {
        folder = 'documents';
    }

    const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: `${folder}/${fileName}`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        // Set appropriate ACL based on your requirements
        // ACL: 'public-read', // Be careful with this setting
    };

    try {
        const command = new PutObjectCommand(params);
        const data = await s3Client.send(command);

        // Log success for monitoring
        console.log(`File uploaded successfully: ${params.Key}`);

        // Return the S3 URL and additional metadata
        res.json({
            url: `${CDN_URL}/${params.Key}`,
            key: params.Key,
            fileType: req.file.mimetype,
            originalName: req.file.originalname,
            uploadedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('S3 upload error:', error);
        res.status(500).json({ error: 'Upload to S3 failed', details: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));