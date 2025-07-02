import {got} from 'got';
import {MongoClient} from 'mongodb';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// MongoDB connection string
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;
const client = new MongoClient(uri);

// API token
const API_TOKEN = process.env.API_TOKEN;
const MAX_CONCURRENT_REQUESTS = 30;

async function fetchArticleDetails(articleId, contentId, db) {
    const articleCollection = db.collection('articles');
    // Check if article exists in MongoDB
    const existingArticle = await articleCollection.findOne({article_id: articleId});

    if (existingArticle) {
        console.log(`Article ${articleId} already exists in database, skipping...`);
        return false;
    }

    console.log(`Fetching details for article ${articleId}...`);
    const BASE_URL = process.env.BASE_URL + 'api/v1';
    const articleDetailUrl = `${BASE_URL}/reader/section-detail?api_token=${API_TOKEN}&article_id=${articleId}&share_uid=`;

    try {
        const detailResponse = await got.get(articleDetailUrl, {responseType: 'json'});

        if (detailResponse.body.status === 'success' && detailResponse.body.data) {
            // Save article to MongoDB
            const parts = detailResponse.body.data.part || [];

            for (const part of parts) {

                await articleCollection.updateOne(
                    {article_id: articleId, part_id: part.part_id},
                    {
                        $set: {
                            ...part,
                            fetch_time: new Date()
                        }
                    },
                    {upsert: true}
                );
            }

            console.log(`Successfully saved article ${articleId}`);
            return true;
        } else {
            console.warn(`API didn't return success status for article_id: ${articleId}`);
            return false;
        }
    } catch (error) {
        console.error(`Error fetching article ${articleId}: ${error.message}`);
        return false;
    }
}

async function fetchArticles(contentId, db) {
    try {
        // Fetch article list
        const articleListUrl = process.env.BASE_URL + `api/v1/content/article_list?api_token=${API_TOKEN}&content_id=${contentId}&count=1001`;

        console.log(`Fetching article list for content_id: ${contentId}`);
        const articleListResponse = await got.get(articleListUrl, {responseType: 'json'});

        if (articleListResponse.body.status !== 'success' || !articleListResponse.body.data.article_list) {
            console.error('Failed to fetch article list or no articles found');
            return false;
        }

        const articleList = articleListResponse.body.data.article_list;
        console.log(`Found ${articleList.length} articles for content_id: ${contentId}`);

        // Process articles in batches of MAX_CONCURRENT_REQUESTS
        for (let i = 0; i < articleList.length; i += MAX_CONCURRENT_REQUESTS) {
            const batch = articleList.slice(i, i + MAX_CONCURRENT_REQUESTS);
            const batchPromises = batch.map(article =>
                fetchArticleDetails(article.article_id, contentId, db)
            );

            console.log(`Processing batch ${i / MAX_CONCURRENT_REQUESTS + 1}/${Math.ceil(articleList.length / MAX_CONCURRENT_REQUESTS)}`);
            await Promise.all(batchPromises);
        }

        console.log(`Finished processing all articles for content_id: ${contentId}`);
        return true;
    } catch (error) {
        console.error(`Error processing content_id ${contentId}:`, error.message);
        return false;
    }
}

export async function updateArticles() {
    const currentTime = new Date();

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const updateTimeCollection = db.collection('update_time');
        const contentsCollection = db.collection('contents');

        // Get the last update time or set to Jan 1, 1900 if not found
        const defaultDate = new Date(1900, 0, 1, 0, 0, 0);
        const updateTimeDoc = await updateTimeCollection.findOne({type: 'article_update'});
        const lastUpdateTime = updateTimeDoc ? new Date(updateTimeDoc.last_update) : defaultDate;

        console.log(`Last update time: ${lastUpdateTime}`);

        // Find contents that have been updated since the last update
        const updatedContents = await contentsCollection.find({
            $expr: {
                $gt: [
                    {$toDate: "$article_update_time"},
                    lastUpdateTime
                ]
            }
        }).toArray();
        console.log(`Found ${updatedContents.length} content items that need updating`);

        // Process each content (these will still be processed sequentially)
        for (const content of updatedContents) {
            console.log(`Processing content_id: ${content.content_id}, updated at: ${content.article_update_time}`);
            await fetchArticles(content.content_id, db);
        }

        // Update the last update time
        await updateTimeCollection.updateOne(
            {type: 'article_update'},
            {$set: {last_update: currentTime}},
            {upsert: true}
        );

        console.log(`Updated last update time to: ${currentTime}`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}
