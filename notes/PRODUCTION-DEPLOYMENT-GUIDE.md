# Answly - Production Deployment Guide

**Last Updated:** November 9, 2025  
**Version:** Phase 2 Complete (Sessions 7-9)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Redis Setup](#redis-setup)
6. [Backend Deployment](#backend-deployment)
7. [Frontend Deployment](#frontend-deployment)
8. [Monitoring & Logging](#monitoring--logging)
9. [Security Checklist](#security-checklist)
10. [Performance Optimization](#performance-optimization)
11. [Cost Management](#cost-management)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher
- **Redis** 7.x or higher
- **Docker** (optional but recommended)
- **SSL Certificate** for HTTPS

### Required API Keys

- **OpenAI API Key** (GPT-4 access)
- **Anthropic API Key** (optional, for Claude)
- **Cohere API Key** (optional)
- **Pinecone API Key** (optional, for vector search)

### Recommended Infrastructure

**Small Scale (< 1,000 users):**
- 1x Application server (2 CPU, 4GB RAM)
- 1x PostgreSQL instance (2 CPU, 4GB RAM, 50GB SSD)
- 1x Redis instance (1 CPU, 2GB RAM)
- Est. cost: $50-100/month

**Medium Scale (1,000 - 10,000 users):**
- 2-3x Application servers (4 CPU, 8GB RAM each)
- 1x PostgreSQL instance (4 CPU, 8GB RAM, 100GB SSD)
- 1x Redis instance (2 CPU, 4GB RAM)
- Load balancer
- Est. cost: $200-400/month

**Large Scale (> 10,000 users):**
- 5-10x Application servers (auto-scaling)
- PostgreSQL cluster (primary + replicas)
- Redis cluster
- CDN for static assets
- Est. cost: $1,000-3,000/month

---

## Infrastructure Setup

### Option 1: Docker Compose (Recommended for Small-Medium Scale)

**1. Create production docker-compose.yml:**

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:14-alpine
    container_name: answly-postgres
    restart: always
    environment:
      POSTGRES_DB: answly
      POSTGRES_USER: answly
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U answly"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis for caching and sessions
  redis:
    image: redis:7-alpine
    container_name: answly-redis
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./dev/backend
      dockerfile: Dockerfile.prod
    container_name: answly-backend
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgresql://answly:${DB_PASSWORD}@postgres:5432/answly
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      PINECONE_API_KEY: ${PINECONE_API_KEY}
      CACHE_ENABLED: "true"
      RATE_LIMIT_ENABLED: "true"
    ports:
      - "4000:4000"
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend
  frontend:
    build:
      context: ./dev/frontend
      dockerfile: Dockerfile.prod
    container_name: answly-frontend
    restart: always
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: https://api.yourdomain.com
    ports:
      - "3000:3000"

volumes:
  postgres_data:
  redis_data:
```

**2. Create backend Dockerfile.prod:**

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 4000

CMD ["node", "dist/main"]
```

**3. Create frontend Dockerfile.prod:**

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["npm", "start"]
```

---

## Environment Configuration

### Backend .env.production

```bash
# Application
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgresql://answly:STRONG_PASSWORD@postgres:5432/answly
DB_POOL_SIZE=20

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=STRONG_REDIS_PASSWORD

# Authentication
JWT_SECRET=VERY_LONG_RANDOM_STRING_HERE
JWT_EXPIRATION=7d
REFRESH_TOKEN_EXPIRATION=30d

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
COHERE_API_KEY=...

# Vector Store (Optional)
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=answly-questions

# Caching
CACHE_ENABLED=true
CACHE_TTL=86400

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=30
RATE_LIMIT_WINDOW=60000

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=info

# Email (for notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@yourdomain.com
SMTP_PASSWORD=...
FROM_EMAIL=noreply@yourdomain.com
```

### Frontend .env.production

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

---

## Database Setup

### 1. Initialize Database

```bash
# Connect to PostgreSQL
psql -U postgres -h localhost

# Create database and user
CREATE DATABASE answly;
CREATE USER answly WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE answly TO answly;
\q
```

### 2. Run Migrations

```bash
cd dev/backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed initial data
npx prisma db seed
```

### 3. Database Backup Script

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="answly_backup_$DATE.sql"

docker exec answly-postgres pg_dump -U answly answly > "$BACKUP_DIR/$FILENAME"

# Compress
gzip "$BACKUP_DIR/$FILENAME"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "answly_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $FILENAME.gz"
```

**Set up daily cron job:**
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup-db.sh
```

---

## Redis Setup

### Configuration

**redis.conf:**
```conf
# Bind to all interfaces (use firewall for security)
bind 0.0.0.0

# Require password
requirepass STRONG_REDIS_PASSWORD

# Enable persistence
appendonly yes
appendfsync everysec

# Max memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Logging
loglevel notice
logfile /var/log/redis/redis.log
```

---

## Backend Deployment

### Step-by-Step Deployment

**1. Build Application:**
```bash
cd dev/backend
npm ci --only=production
npm run build
```

**2. Run Migrations:**
```bash
npx prisma migrate deploy
```

**3. Start Application:**
```bash
# With PM2 (recommended)
pm2 start dist/main.js --name answly-backend -i max

# Or with systemd service
sudo systemctl start answly-backend
```

**4. Health Check:**
```bash
curl http://localhost:4000/health
```

### PM2 Configuration

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'answly-backend',
    script: './dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    autorestart: true,
    max_memory_restart: '1G',
  }],
};
```

**Start with PM2:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

**1. Install Vercel CLI:**
```bash
npm i -g vercel
```

**2. Deploy:**
```bash
cd dev/frontend
vercel --prod
```

**3. Configure environment variables in Vercel dashboard**

### Option 2: Self-Hosted

**1. Build:**
```bash
cd dev/frontend
npm ci
npm run build
```

**2. Start:**
```bash
npm start
```

**3. Reverse Proxy with Nginx:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

---

## Monitoring & Logging

### 1. Application Monitoring (Sentry)

**Backend integration:**
```typescript
// main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 0.1,
});
```

**Frontend integration:**
```typescript
// pages/_app.tsx
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: 'production',
});
```

### 2. Performance Monitoring

**Key Metrics to Track:**
- API response times
- Database query performance
- AI response times
- Cache hit rates
- Error rates
- User session duration

**Grafana Dashboard:**
```yaml
# docker-compose.yml additions
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

### 3. Log Management

**Winston configuration:**
```typescript
import * as winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

---

## Security Checklist

### Pre-Deployment

- [ ] All environment variables use strong random values
- [ ] JWT secret is at least 32 characters
- [ ] Database passwords are strong (16+ characters)
- [ ] Redis requires password authentication
- [ ] API keys are not committed to git
- [ ] HTTPS/SSL certificates are configured
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] SQL injection prevention (using Prisma)
- [ ] XSS prevention (React auto-escaping)
- [ ] CSRF protection enabled

### Post-Deployment

- [ ] Security headers configured (Helmet.js)
- [ ] Database backups automated
- [ ] Logs are being collected
- [ ] Monitoring alerts configured
- [ ] DDoS protection enabled (Cloudflare)
- [ ] Regular security audits scheduled

### Security Headers (Helmet.js)

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

---

## Performance Optimization

### 1. Database Optimization

**Add indexes:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_questions_exam_topic ON questions(exam_id, topic);
CREATE INDEX idx_answers_user_date ON answers(user_id, answered_at);
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at);
```

**Connection pooling:**
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  pool_size = 20
}
```

### 2. Caching Strategy

**Levels of caching:**
1. **Response caching** (Redis) - AI tutor responses
2. **Database query caching** (Redis) - Frequent queries
3. **CDN caching** (Cloudflare) - Static assets
4. **Browser caching** - Images, CSS, JS

### 3. Load Balancing

**Nginx load balancer:**
```nginx
upstream backend {
    least_conn;
    server backend1:4000;
    server backend2:4000;
    server backend3:4000;
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

---

## Cost Management

### AI API Cost Monitoring

**Daily cost alerts:**
```typescript
// Check daily costs
const dailyCost = await aiUsageTracking.getDailyStats();

if (dailyCost.totalCost > 100) {
  // Send alert
  await sendAlert({
    subject: 'AI API Cost Alert',
    message: `Daily cost exceeded $100: $${dailyCost.totalCost}`,
  });
}
```

**Cost optimization strategies:**
1. Enable response caching (saves ~70% of costs)
2. Use GPT-3.5 for simple queries
3. Set daily cost limits
4. Monitor cache hit rates
5. Optimize prompts to reduce tokens

### Infrastructure Costs

**Monthly estimates:**
| Component | Small | Medium | Large |
|-----------|-------|--------|-------|
| Compute | $30 | $150 | $800 |
| Database | $20 | $100 | $400 |
| Redis | $10 | $30 | $150 |
| AI APIs | $50 | $300 | $2,000 |
| CDN | $5 | $20 | $100 |
| **Total** | **$115** | **$600** | **$3,450** |

---

## Troubleshooting

### Common Issues

**1. Database connection errors:**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -U answly -h localhost -d answly

# Check logs
docker logs answly-postgres
```

**2. Redis connection errors:**
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli -a YOUR_PASSWORD ping

# Check logs
docker logs answly-redis
```

**3. High AI costs:**
```bash
# Check cache stats
curl http://localhost:4000/api/tutor/cache/stats

# Review usage logs
SELECT 
  DATE(created_at) as date,
  SUM(cost) as total_cost,
  COUNT(*) as request_count
FROM "AIUsageLog"
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**4. Slow API responses:**
```bash
# Check database query performance
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

# Check Redis latency
redis-cli --latency

# Check application logs
pm2 logs answly-backend
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Load testing completed

### Deployment
- [ ] Database backed up
- [ ] Maintenance mode enabled
- [ ] Database migrations run
- [ ] Application deployed
- [ ] Health checks passing
- [ ] Smoke tests completed
- [ ] Maintenance mode disabled

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify AI integration
- [ ] Test critical user flows
- [ ] Review logs for errors
- [ ] Confirm backups working

---

## Support & Maintenance

### Regular Tasks

**Daily:**
- Check error logs
- Monitor AI costs
- Review performance metrics

**Weekly:**
- Review security alerts
- Check backup integrity
- Analyze user feedback

**Monthly:**
- Update dependencies
- Security audit
- Performance optimization review
- Cost analysis

---

## Emergency Contacts

**Critical Issues:**
- On-call engineer: [Contact info]
- Database admin: [Contact info]
- DevOps lead: [Contact info]

**Service Providers:**
- OpenAI Support: https://help.openai.com
- Vercel Support: https://vercel.com/support
- PostgreSQL: Community forums

---

**Deployment Guide Version:** 1.0  
**Last Updated:** November 9, 2025  
**Next Review:** December 9, 2025
