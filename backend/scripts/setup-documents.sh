#!/bin/bash

# Setup Documents Database
# This script sets up the documents table and seeds test data

echo "================================"
echo "Documents Database Setup"
echo "================================"
echo ""

# Check if we're in the backend directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "Error: Please run this script from the backend directory"
    exit 1
fi

# Step 1: Generate Prisma Client
echo "Step 1: Generating Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "Error: Failed to generate Prisma client"
    exit 1
fi
echo "✓ Prisma client generated"
echo ""

# Step 2: Run migrations
echo "Step 2: Running database migrations..."
npx prisma migrate dev --name add_documents_table
if [ $? -ne 0 ]; then
    echo "Error: Failed to run migrations"
    exit 1
fi
echo "✓ Migrations completed"
echo ""

# Step 3: Run SQL migrations for vector search
echo "Step 3: Setting up vector search functions..."
psql $DATABASE_URL -f prisma/migrations/20250106_document_vector_search_function.sql
if [ $? -ne 0 ]; then
    echo "Warning: Vector search function setup failed (may need to run manually)"
else
    echo "✓ Vector search functions created"
fi
echo ""

# Step 4: Seed test documents
echo "Step 4: Seeding test documents..."
npx ts-node prisma/seeds/documents.seed.ts
if [ $? -ne 0 ]; then
    echo "Error: Failed to seed documents"
    exit 1
fi
echo "✓ Test documents seeded"
echo ""

echo "================================"
echo "Setup completed successfully!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Check the documents in your database"
echo "2. Test document search functionality"
echo "3. Integrate with RAG service (TODO item 3)"
echo ""

