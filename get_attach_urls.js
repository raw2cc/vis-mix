import {MongoClient} from 'mongodb'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// MongoDB connection configuration
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

// Function to extract URLs from an object (modified to only include vistopia URLs)
function extractMediaUrls(obj) {
    // Regex patterns for different media types
    const imageRegex = /(https?:\/\/[^\s"'<>()]+\.(jpg|jpeg|png|gif|bmp|svg|webp))/gi;
    const videoRegex = /(https?:\/\/[^\s"'<>()]+\.(mp4|avi|mov|wmv|flv|mkv|webm))/gi;
    const audioRegex = /(https?:\/\/[^\s"'<>()]+\.(mp3|wav|ogg|aac|flac))/gi;
    const fileRegex = /(https?:\/\/[^\s"'<>()]+\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar))/gi;

    const objString = JSON.stringify(obj);
    const urls = [];

    let match;
    [imageRegex, videoRegex, audioRegex, fileRegex].forEach(regex => {
        while ((match = regex.exec(objString)) !== null) {
            // Only include URLs that contain "vistopia"
            if (match[0].includes('vistopia')) {
                urls.push({
                    url: match[0],
                    type: match[2]
                });
            }
        }
    });

    return urls;
}

// Function to process a single article
async function processArticle(article, db) {
    console.log(`Processing article: ${article._id}`);

    // Extract URLs from the article
    const mediaUrls = extractMediaUrls(article);
    console.log(`Found ${mediaUrls.length} vistopia media URLs in article ${article._id}`);

    const filesCollection = db.collection('files');
    
    // Save URLs to files collection
    if (mediaUrls.length > 0) {
        const fileDocumentsToInsert = [];
        
        // Filter out upload_img.png files and check for existing URLs
        for (const item of mediaUrls.filter(item => !item.url.endsWith('upload_img.png'))) {
            // Check if this URL already exists in the database
            const existingFile = await filesCollection.findOne({ url: item.url });
            
            if (!existingFile) {
                fileDocumentsToInsert.push({
                    url: item.url,
                    type: item.type,
                    articleId: article._id,
                    createdAt: new Date()
                });
            } else {
                console.log(`Skipping existing URL: ${item.url}`);
            }
        }

        if (fileDocumentsToInsert.length > 0) {
            // Deduplicate fileDocumentsToInsert based on URL
            const uniqueDocuments = Array.from(
                fileDocumentsToInsert.reduce((map, item) => {
                    if (!map.has(item.url)) {
                        map.set(item.url, item);
                    }
                    return map;
                }, new Map()).values()
            );

            // Log if duplicates were removed
            if (uniqueDocuments.length < fileDocumentsToInsert.length) {
                console.log(`Removed ${fileDocumentsToInsert.length - uniqueDocuments.length} duplicate URLs`);
            }

            await filesCollection.insertMany(uniqueDocuments);
            console.log(`Inserted ${uniqueDocuments.length} new URLs for article ${article._id}`);
        } else {
            console.log(`No new URLs to insert for article ${article._id}`);
        }
    }

    // Mark article as processed
    const articlesCollection = db.collection('articles');
    await articlesCollection.updateOne(
        { _id: article._id },
        { $set: { processed: true, processedAt: new Date() } }
    );

    return article._id;
}

async function processArticles() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const articlesCollection = db.collection('articles');

        // Find all unprocessed articles
        const unprocessedArticles = await articlesCollection
            .find({ processed: { $ne: true } })
            .toArray();

        console.log(`Found ${unprocessedArticles.length} unprocessed articles`);

        let processedCount = 0;
        const batchSize = 30; // Process 30 articles concurrently

        // Process in batches with 30 concurrent operations
        for (let i = 0; i < unprocessedArticles.length; i += batchSize) {
            const batch = unprocessedArticles.slice(i, i + batchSize);

            console.log(`Processing batch ${i / batchSize + 1} with ${batch.length} articles`);

            // Process the batch concurrently
            const promises = batch.map(article => processArticle(article, db));
            await Promise.all(promises);

            processedCount += batch.length;
            console.log(`Progress: ${processedCount}/${unprocessedArticles.length} articles processed`);
        }

        console.log(`Processing complete. Processed ${processedCount} articles.`);

    } catch (err) {
        console.error('Error processing articles:', err);
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}

// Run the script
processArticles().catch(console.error);
