# TropoMetrics API Server

A caching proxy server for the Open-Meteo API that helps avoid rate limits by caching responses in Redis.

## Overview

This API server acts as a transparent caching layer between your application and the Open-Meteo API. It maintains the exact same API structure as Open-Meteo, so you can use it as a drop-in replacement by simply changing the base URL.

## Features

- 🚀 **Transparent Caching**: Maintains exact Open-Meteo API structure
- ⚡ **Redis-Backed**: Fast, reliable caching with Redis
- 🔄 **Configurable TTL**: Set custom cache expiration times
- 🐳 **Docker Ready**: Complete Docker Compose setup included
- 💪 **Health Checks**: Built-in health monitoring
- 🔒 **Rate Limit Protection**: Reduce API calls through intelligent caching

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Local Development

```bash
# Install dependencies
npm install

# Start Redis (required)
docker run -d -p 6379:6379 redis:7-alpine

# Start the API server
npm start
```

## Usage

Simply replace the Open-Meteo API base URL with your server URL:

**Before:**
```
https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m
```

**After:**
```
http://localhost:3000/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m
```

## Configuration

Configure the server using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3000` |
| `CACHE_TTL` | Cache time-to-live (seconds) | `3600` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |

### Example with Custom Settings

```bash
CACHE_TTL=7200 PORT=8080 node server.js
```

Or modify `docker-compose.yml`:

```yaml
environment:
  - CACHE_TTL=7200
  - PORT=8080
```

## API Endpoints

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "redis": "connected"
}
```

### Weather Forecast (Proxied)

All Open-Meteo API endpoints are supported. Examples:

```bash
# Current weather
curl "http://localhost:3000/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m"

# Hourly forecast
curl "http://localhost:3000/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m,precipitation"
```

## How It Works

1. Request comes to the API server
2. Server generates a cache key based on the endpoint and query parameters
3. If cached data exists and hasn't expired, it's returned immediately (Cache HIT)
4. If no cached data exists, the request is forwarded to Open-Meteo API (Cache MISS)
5. Response is cached in Redis for future requests
6. Response is returned to the client

## Monitoring

### Check Logs

```bash
# Docker Compose
docker-compose logs -f api

# Docker
docker logs -f openmeteo-cache-api
```

Look for:
- `Cache HIT` - Request served from cache
- `Cache MISS` - Request forwarded to Open-Meteo API
- `Redis ready!` - Successful Redis connection

### Health Status

The `/health` endpoint provides real-time status:

```bash
curl http://localhost:3000/health
```

## Development

### Project Structure

```
.
├── server.js           # Main application
├── package.json        # Dependencies
├── Dockerfile          # Docker image configuration
├── docker-compose.yml  # Multi-container setup
└── .github/
    └── copilot-instructions.md  # Copilot guidelines
```

### Dependencies

- **express**: Web framework
- **redis**: Redis client for caching
- **axios**: HTTP client for API requests

## Troubleshooting

### Redis Connection Issues

```bash
# Check if Redis is running
docker ps | grep redis

# Test Redis connection
docker exec openmeteo-redis redis-cli ping
```

### Cache Not Working

Check the logs for cache HIT/MISS messages:

```bash
docker-compose logs -f api
```

Make identical requests twice - the second should show a cache HIT.

### Port Already in Use

Change the port in `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Maps host port 8080 to container port 3000
```

## License

This project is provided as-is for use with the Open-Meteo API.

## Contributing

Contributions are welcome! Please ensure all changes:
- Follow the existing code style
- Include appropriate error handling
- Update documentation as needed
- Use Dutch for console log messages (existing convention for internal consistency)
  - Connection messages: "Redis verbonden met..."
  - Cache operations: "Cache HIT voor..." / "Cache MISS voor..."
  - Error messages: "Te veel pogingen" / "Kan niet verbinden met..."
  - Shutdown: "SIGTERM ontvangen, server wordt afgesloten..."

## Acknowledgments

- [Open-Meteo API](https://open-meteo.com/) for providing free weather data
- Built with Node.js, Express, and Redis
