#!/usr/bin/env bash
# Exit on error
set -o errexit

# Nuclear option: Force fresh Prisma build
echo "🧹 Cleaning old Prisma artifacts..."
rm -rf node_modules/.prisma

# Install dependencies (including dev dependencies for prisma CLI)
echo "📦 Installing dependencies..."
npm ci --include=dev

# Generate Prisma Client
echo "🔨 Generating Prisma Client..."
npx prisma generate --schema=prisma/schema.prisma

# Validate Prisma Client
echo "✅ Validating Prisma Client..."
node scripts/validate-prisma.js

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Build the application
echo "🏗️  Building application..."
npm run build

echo "✨ Build completed successfully!"
