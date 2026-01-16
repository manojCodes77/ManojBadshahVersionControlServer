#!/bin/bash
set -e

# Run Prisma migrations
npm run build
npx prisma migrate deploy
