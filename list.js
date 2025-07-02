import {got} from 'got';
import {MongoClient} from 'mongodb';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const API_TOKEN = process.env.API_TOKEN;
const BASE_URL = process.env.BASE_URL + 'api/v1/class/content';

// MongoDB connection string
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME;
const COLLECTION_NAME = 'contents';

export async function fetchAllContent() {
    let currentPage = 1;
    let lastPage = 1;
    let allContent = [];
    const client = new MongoClient(MONGO_URI);

    console.log('Starting to fetch content...');

    try {
        // Connect to MongoDB
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        do {
            console.log(`Fetching page ${currentPage}...`);

            const response = await got.get(BASE_URL, {
                searchParams: {
                    api_token: API_TOKEN,
                    class_id: -1,
                    sort: 1,
                    page: currentPage,
                    count: 20 // Using larger count per page for fewer requests
                },
                responseType: 'json'
            });

            if (response.body.status !== 'success') {
                throw new Error(`API returned error status: ${response.body.status}`);
            }

            const {data} = response.body;
            const contentItems = data.data;

            // Process each item in the current page
            for (const item of contentItems) {
                // Add to our collection for counting purposes
                allContent.push(item);

                // Upsert to MongoDB - update if exists, insert if not
                await collection.updateOne(
                    {content_id: item.content_id}, // filter by content_id
                    {
                        $set: {
                            ...item,
                            fetch_time: new Date()
                        }
                    },
                    {upsert: true} // insert if not exists
                );
            }

            // Update pagination info
            lastPage = parseInt(data.last_page);
            currentPage++;

        } while (currentPage <= lastPage);

        console.log(`Successfully fetched and saved ${allContent.length} content items to MongoDB`);

    } catch (error) {
        console.error('Error fetching content or saving to MongoDB:', error.message);
    } finally {
        // Close the connection
        await client.close();
        console.log('MongoDB connection closed');
    }
}
