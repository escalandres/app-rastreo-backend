import { MongoClient } from 'mongodb';

const uri = process.env.DATABASE_URL;

const client = new MongoClient(uri, {});

let cachedDb = null;

async function connect() {
    try {
        await client.connect();
        // console.log("Connected to MongoDB Atlas");
        const db = client.db("app-rastreo");
        return db;
    } catch (err) {
        console.error("Error connecting to MongoDB Atlas:", err);
    }
}


async function disconnect() {
    try {
        if (client) {
            await client.close();
            // console.log("Disconnected from MongoDB Atlas");
        } else {
            console.warn("No active connection to MongoDB Atlas.");
        }
    } catch (err) {
        console.error("Error disconnecting from MongoDB Atlas:", err);
    }
}

export const dbClient = {
    connect,
    disconnect
};