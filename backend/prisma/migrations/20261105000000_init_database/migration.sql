-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BORROWER', 'CUSTODIAN');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('AVAILABLE', 'ON_LOAN');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'FULFILLED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "asset_tag" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "managed_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "borrower_id" UUID NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilled_at" TIMESTAMPTZ,

    CONSTRAINT "loan_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "borrower_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "custodian_id" UUID NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "checked_out_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revoked_tokens" (
    "jti" VARCHAR NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "items_asset_tag_key" ON "items"("asset_tag");

-- CreateIndex
CREATE UNIQUE INDEX "loans_request_id_key" ON "loans"("request_id");

-- CreateIndex
CREATE INDEX "revoked_tokens_expires_at_idx" ON "revoked_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_managed_by_fkey" FOREIGN KEY ("managed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "loan_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_custodian_id_fkey" FOREIGN KEY ("custodian_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

--------------------------------------------------------------------------------
-- Raw SQL Partial Unique Indexes (D-04, D-05, BR-01, BR-05, BR-06)
-- Handcrafted because Prisma schema cannot express partial index predicates
--------------------------------------------------------------------------------

-- BR-01 & BR-05: Exactly one ACTIVE loan per item at any given time
CREATE UNIQUE INDEX "idx_loans_active_item_unique" 
ON "loans"("item_id") 
WHERE "status" = 'ACTIVE';

-- BR-06: At most one PENDING request per borrower for a given item
CREATE UNIQUE INDEX "idx_loan_requests_pending_unique" 
ON "loan_requests"("item_id", "borrower_id") 
WHERE "status" = 'PENDING';
