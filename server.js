const express = require('express');
const redis = require('redis');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_TTL = process.env.CACHE_TTL || 3600; // 1 uur standaard
const OPENMETEO_BASE_URL = 'https://api.open-meteo.com';

// Redis client setup
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;
const redisUrl = `redis://${redisHost}:${redisPort}`;

const redisClient = redis.createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Te veel Redis reconnect pogingen');
        return new Error('Te veel pogingen');
      }
      return retries * 100;
    }
  }
});

redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.on('connect', () => console.log(`Redis verbonden met ${redisUrl}`));
redisClient.on('reconnecting', () => console.log('Redis reconnecting...'));
redisClient.on('ready', () => console.log('Redis ready!'));

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Kan niet verbinden met Redis:', err);
    process.exit(1);
  }
})();

// Genereer cache key op basis van de volledige URL en query parameters
function generateCacheKey(endpoint, query) {
  const sortedQuery = Object.keys(query)
    .sort()
    .reduce((acc, key) => {
      acc[key] = query[key];
      return acc;
    }, {});
  
  const keyString = `${endpoint}:${JSON.stringify(sortedQuery)}`;
  return crypto.createHash('md5').update(keyString).digest('hex');
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await redisClient.ping();
    res.json({ status: 'ok', redis: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', redis: 'disconnected' });
  }
});

// Middleware voor alle Open-Meteo endpoints
app.get('/*', async (req, res) => {
  try {
    const endpoint = req.path;
    const queryParams = req.query;
    
    // Genereer cache key
    const cacheKey = generateCacheKey(endpoint, queryParams);
    
    // Probeer cache te lezen
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache HIT voor ${endpoint}`);
      const parsed = JSON.parse(cachedData);
      return res.json(parsed);
    }
    
    console.log(`Cache MISS voor ${endpoint}`);
    
    // Bouw de Open-Meteo URL
    const openMeteoUrl = `${OPENMETEO_BASE_URL}${endpoint}`;
    
    // Vraag data op bij Open-Meteo
    const response = await axios.get(openMeteoUrl, {
      params: queryParams,
      timeout: 10000,
      validateStatus: (status) => status < 500 // Accept 4xx responses
    });
    
    // Als het een 4xx error is, log de details
    if (response.status >= 400 && response.status < 500) {
      console.error(`Open-Meteo API fout ${response.status}:`, response.data);
      return res.status(response.status).json(response.data);
    }
    
    // Sla op in cache
    await redisClient.setEx(
      cacheKey,
      CACHE_TTL,
      JSON.stringify(response.data)
    );
    
    // Stuur response terug met exacte structuur
    res.json(response.data);
    
  } catch (error) {
    console.error('Error:', error.message);
    
    if (error.response) {
      // Open-Meteo API error - doorsturen met zelfde status
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({ error: 'Gateway timeout' });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Open-Meteo caching server draait op poort ${PORT}`);
  console.log(`Cache TTL: ${CACHE_TTL} seconden`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM ontvangen, server wordt afgesloten...');
  await redisClient.quit();
  process.exit(0);
});
