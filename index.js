const express = require("express");
const axios = require("axios");
const Redis = require("redis");

const redisClient = Redis.createClient({
    url: "redis://localhost:6380", // Add your Redis server URL here
});
const app = express();

app.use(express.json());

async function startRedisClient() {
    try {
        await redisClient.connect(); // Connect to the Redis server
        console.log("Redis client connected successfully");
    } catch (error) {
        console.error("Failed to connect to Redis", error);
    }
}

app.get("/photos", async (req, res) => {
    try {
        const fetchPhotos = async () => {
            const { data } = await axios.get(
                `https://jsonplaceholder.typicode.com/photos`
            );
            return data;
        };

        const photos = await setOrGetDataFromRedis("photos", 3600, fetchPhotos);
        return res.json(photos);
    } catch (error) {
        return res.status(500).send("Server error");
    }
});

app.get("/photos/:id", async (req, res) => {
    const photoId = req.params.id;

    try {
        const fetchPhotoById = async () => {
            const { data } = await axios.get(
                `https://jsonplaceholder.typicode.com/photos/${photoId}`
            );
            return data;
        };

        const photo = await setOrGetDataFromRedis(
            `photo:${photoId}`,
            3600,
            fetchPhotoById
        );
        return res.json(photo);
    } catch (error) {
        return res.status(500).send("Server error");
    }
});

const setOrGetDataFromRedis = async (key, ttl, fetchFunction) => {
    try {
        // Check Redis for cached data
        const cachedData = await redisClient.get(key);
        if (cachedData) {
            console.log(`Returning cached data for key: ${key}`);
            return JSON.parse(cachedData); // Return cached data
        }

        // Fetch data if not found in cache
        const data = await fetchFunction();

        // Cache the data in Redis
        await redisClient.setEx(key, ttl, JSON.stringify(data));
        console.log(`Data cached in Redis for key: ${key}`);

        return data; // Return fetched data
    } catch (error) {
        console.error(`Error in setOrGetDataFromRedis for key: ${key}`, error);
        throw new Error("Failed to get or set data in Redis");
    }
};

app.listen(3000, () => {
    console.log(`Server running on port 3000`);
    startRedisClient();
});
