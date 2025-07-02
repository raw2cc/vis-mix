import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import * as Minio from 'minio';
import { URL } from 'url';
import http from 'http';
import https from 'https';
import stream from 'stream';
import { promisify } from 'util';
import os from 'os';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const pipeline = promisify(stream.pipeline);

// MongoDB connection configuration
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

// MinIO configuration
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: parseInt(process.env.MINIO_PORT),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Temp directory for downloads
const tempDir = path.join(os.tmpdir(), 'vis-downloads');

// Create temp directory if it doesn't exist
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// MinIO bucket name
const bucketName = "files";

// Function to download file from URL
async function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;

        const request = client.get(url, (response) => {
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download: ${response.statusCode}`));
            }

            const fileStream = fs.createWriteStream(destPath);
            pipeline(response, fileStream)
                .then(async () => {
                    await delay(100);
                    resolve(destPath)
                })
                .catch(reject);
        });

        request.on('error', reject);
        request.end();
    });
}

async function processFiles() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const filesCollection = db.collection('files');

        // Get all documents from files collection
        const files = await filesCollection
            .find({ isReal: { $ne: true } })
            .toArray();
        console.log(`Found ${files.length} files in database`);

        let successCount = 0;
        let failedCount = 0;

        // Process files in batches to avoid overwhelming the system
        const batchSize = 100;
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);

            await Promise.all(batch.map(async (file) => {
                try {
                    const urlObj = new URL(file.url);
                    const urlPath = urlObj.pathname;
                    const fileName = path.basename(urlPath);
                    const tempFilePath = path.join(tempDir, fileName);

                    try {
                        // Download file from URL
                        await downloadFile(file.url, tempFilePath);
                        console.log(`Downloaded: ${fileName}`);

                        // MinIO upload path (remove domain part)
                        const minioPath = urlPath.startsWith('/') ? urlPath.substring(1) : urlPath;

                        // Upload to MinIO
                        await minioClient.fPutObject(bucketName, minioPath, tempFilePath);
                        console.log(`Uploaded to MinIO: ${minioPath}`);

                        // Update MongoDB document
                        await filesCollection.updateOne(
                            { _id: file._id },
                            { $set: { isReal: true, minioPath: minioPath } }
                        );

                        successCount++;
                    } catch (downloadErr) {
                        console.error(`Failed to download: ${file.url}`, downloadErr.message);

                        // Update MongoDB document - file is not accessible
                        await filesCollection.updateOne(
                            { _id: file._id },
                            { $set: { isReal: false, error: downloadErr.message } }
                        );

                        failedCount++;
                    } finally {
                        // Clean up temp file if it exists
                        if (fs.existsSync(tempFilePath)) {
                            fs.unlinkSync(tempFilePath);
                        }
                    }
                } catch (err) {
                    console.error(`Error processing file ${file.url}:`, err);
                }
            }));

            console.log(`Progress: ${Math.min(i + batchSize, files.length)}/${files.length}`);
        }

        console.log('Processing complete:');
        console.log(`Files successfully processed: ${successCount}`);
        console.log(`Files failed: ${failedCount}`);

    } catch (err) {
        console.error('Error processing files:', err);
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}

// Ensure MinIO bucket exists before starting
async function ensureBucketExists() {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
        await minioClient.makeBucket(bucketName);
        console.log(`Bucket '${bucketName}' created.`);
    } else {
        console.log(`Bucket '${bucketName}' already exists.`);
    }
}

// Run the script
(async () => {
    try {
        await ensureBucketExists();
        await processFiles();
    } catch (error) {
        console.error('Error:', error);
    }
})();