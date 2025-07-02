import {got} from 'got';
import {MongoClient} from 'mongodb';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const API_TOKEN = process.env.API_TOKEN;
const BASE_URL = process.env.BASE_URL + 'api/v1/content/content-show';

// MongoDB connection string
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME;
const SOURCE_COLLECTION = 'contents';
const TARGET_COLLECTION = 'content-show';

export async function fetchContentShowDetails() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(DB_NAME);
        const sourceCollection = db.collection(SOURCE_COLLECTION);
        const targetCollection = db.collection(TARGET_COLLECTION);

        // Get all content IDs from the contents collection
        const contentItems = await sourceCollection.find({}, {projection: {content_id: 1}}).toArray();
        console.log(`Found ${contentItems.length} content items to process`);

        // Process each content item
        for (let i = 0; i < contentItems.length; i++) {
            const contentId = contentItems[i].content_id;
            console.log(`Processing item ${i + 1}/${contentItems.length}: content_id ${contentId}`);

            try {
                // Fetch show details for this content ID
                const response = await got.get(`${BASE_URL}/${contentId}`, {
                    searchParams: {
                        api_token: API_TOKEN,
                        content_channel: 'undefined'
                    },
                    responseType: 'json'
                });

                if (response.body.status === 'success' && response.body.data) {
                    // Save or update in the target collection
                    await targetCollection.updateOne(
                        {content_id: contentId},
                        {
                            $set: {
                                ...response.body.data,
                                fetch_time: new Date()
                            }
                        },
                        {upsert: true}
                    );
                    console.log(`Successfully saved data for content_id: ${contentId}`);
                } else {
                    console.warn(`API didn't return success status for content_id: ${contentId}`);
                }
            } catch (error) {
                console.error(`Error fetching content_id ${contentId}: ${error.message}`);
            }

        }

        console.log('Finished processing all content items');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}

fetchContentShowDetails()