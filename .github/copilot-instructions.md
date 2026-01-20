# Copilot Instructions for TropoMetrics API Server

## Project Overview

This is an Open-Meteo API caching proxy server that acts as a transparent cache layer to reduce rate limit issues when accessing the Open-Meteo API. The server maintains the exact same API structure as Open-Meteo, allowing existing clients to simply change the base URL without any code modifications.

## Architecture

- **Language**: Node.js (JavaScript)
- **Framework**: Express.js
- **Cache**: Redis
- **Deployment**: Docker + Docker Compose
- **API Proxy Target**: https://api.open-meteo.com

## Key Components

### server.js
The main application file that:
- Sets up Express server on port 3000 (configurable via `PORT` env var)
- Connects to Redis for caching API responses
- Generates cache keys based on endpoint path and query parameters (MD5 hash)
- Proxies requests to Open-Meteo API on cache miss
- Stores responses in Redis with configurable TTL (default 3600 seconds)
- Provides `/health` endpoint for health checks

### Docker Setup
- **Dockerfile**: Alpine-based Node.js 20 image with health checks
- **docker-compose.yml**: Orchestrates Redis and API containers with proper dependencies

## Development Guidelines

### Code Style
- Use Dutch for console logging messages (existing pattern)
- Use async/await for asynchronous operations
- Include proper error handling with try-catch blocks
- Log cache hits/misses for debugging

### Environment Variables
- `PORT`: API server port (default: 3000)
- `CACHE_TTL`: Cache time-to-live in seconds (default: 3600)
- `REDIS_HOST`: Redis hostname (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)

### Caching Strategy
- Cache keys are generated using MD5 hash of: `endpoint:sorted_query_params`
- Query parameters are sorted alphabetically before hashing to ensure consistency
- TTL is configurable via `CACHE_TTL` environment variable
- Health endpoint (`/health`) is NOT cached

### Error Handling
- 4xx responses from Open-Meteo are passed through to client (logged but not treated as errors)
- 5xx responses are treated as errors
- Timeout errors (ECONNABORTED) return 504 Gateway Timeout
- Redis connection errors result in process exit

### API Compatibility
- ALL requests (except `/health`) are proxied to Open-Meteo API
- Query parameters are passed through unchanged
- Response structure is maintained exactly as returned by Open-Meteo
- HTTP status codes are preserved

## Testing

### Local Development
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Health Check
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok","redis":"connected"}`

### API Test
```bash
curl "http://localhost:3000/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m"
```

### Verify Caching
- First request should show "Cache MISS" in logs
- Second identical request should show "Cache HIT" in logs

## Common Tasks

### Modify Cache Duration
Edit `CACHE_TTL` in `docker-compose.yml` (value in seconds)

### Add Logging
Add console.log statements - use Dutch for consistency with existing logs

### Change Redis Configuration
Modify environment variables in `docker-compose.yml` under `api` service

### Update Dependencies
1. Modify `package.json`
2. Rebuild Docker image: `docker-compose up -d --build`

## Deployment

The application is designed to run in Docker containers:
1. Redis container for caching (persistent storage via volume)
2. API container that depends on Redis health check

Both containers have health checks and restart policies configured.

## Important Notes

- The `/health` endpoint must be defined BEFORE the catch-all `/*` route
- Redis connection uses reconnection strategy (max 10 retries)
- Graceful shutdown is implemented for SIGTERM signal
- Docker health check polls `/health` every 30 seconds
