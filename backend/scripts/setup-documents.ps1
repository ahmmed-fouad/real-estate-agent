# Setup Documents Database (PowerShell version)
# This script sets up the documents table and seeds test data

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Documents Database Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if we are in the backend directory
if (-not (Test-Path "prisma/schema.prisma")) {
    Write-Host "Error: Please run this script from the backend directory" -ForegroundColor Red
    exit 1
}

# Step 1: Generate Prisma Client
Write-Host "Step 1: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host "Success: Prisma client generated" -ForegroundColor Green
Write-Host ""

# Step 2: Run migrations
Write-Host "Step 2: Running database migrations..." -ForegroundColor Yellow
# Use migrate deploy for existing databases
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Migration may have failed, trying alternative..." -ForegroundColor Yellow
    # Try pushing schema directly
    npx prisma db push --accept-data-loss
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to apply schema" -ForegroundColor Red
        exit 1
    }
}
Write-Host "Success: Schema updated" -ForegroundColor Green
Write-Host ""

# Step 3: Run SQL migrations for vector search (manual step)
Write-Host "Step 3: Vector search functions..." -ForegroundColor Yellow
Write-Host "Note: You may need to manually run the SQL migration:" -ForegroundColor Yellow
Write-Host "  prisma/migrations/20250106_document_vector_search_function.sql" -ForegroundColor Yellow
Write-Host "  against your database using psql or your database client" -ForegroundColor Yellow
Write-Host ""

# Step 4: Seed test documents
Write-Host "Step 4: Seeding test documents..." -ForegroundColor Yellow
npx ts-node prisma/seeds/documents.seed.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to seed documents" -ForegroundColor Red
    exit 1
}
Write-Host "Success: Test documents seeded" -ForegroundColor Green
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Setup completed successfully!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "1. Check the documents in your database" -ForegroundColor White
Write-Host "2. Test document search functionality" -ForegroundColor White
Write-Host "3. Integrate with RAG service (TODO item 3)" -ForegroundColor White
Write-Host ""
