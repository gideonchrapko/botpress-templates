#!/bin/bash
echo "For Prisma Accelerate, you need:"
echo "1. Accelerate URL for queries (what you have in DATABASE_URL)"
echo "2. Direct database URL for migrations"
echo ""
echo "Check your Vercel environment variables for:"
echo "- POSTGRES_URL (direct connection)"
echo "- Or use Prisma Migrate with the direct URL"
