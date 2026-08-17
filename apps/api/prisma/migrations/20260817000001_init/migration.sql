-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('pending_verification', 'active', 'disabled');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('admin', 'super_admin');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "OtpOwnerType" AS ENUM ('student', 'admin');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('verify_email', 'password_reset');

-- CreateEnum
CREATE TYPE "ListStatus" AS ENUM ('draft', 'active', 'closed');

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "student_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'pending_verification',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "status" "AdminStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_type" "OtpOwnerType" NOT NULL,
    "owner_id" UUID NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_years" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "election_year_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ListStatus" NOT NULL DEFAULT 'draft',
    "voting_start_at" TIMESTAMP(3),
    "voting_end_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_list_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "photo_path" TEXT,
    "video_path" TEXT,
    "poster_path" TEXT,
    "executive_summary" TEXT,
    "why_vote_for_me" TEXT,
    "vision" TEXT,
    "mission" TEXT,
    "description" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "candidate_list_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "winners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "election_year_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "candidate_list_id" UUID NOT NULL,
    "promoted_by_admin_id" UUID NOT NULL,
    "promoted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_published" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "winners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_number_key" ON "students"("student_number");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "otp_codes_owner_type_owner_id_purpose_consumed_at_idx" ON "otp_codes"("owner_type", "owner_id", "purpose", "consumed_at");

-- CreateIndex
CREATE UNIQUE INDEX "election_years_year_key" ON "election_years"("year");

-- CreateIndex
CREATE INDEX "candidate_lists_election_year_id_status_idx" ON "candidate_lists"("election_year_id", "status");

-- CreateIndex
CREATE INDEX "candidates_candidate_list_id_idx" ON "candidates"("candidate_list_id");

-- CreateIndex
CREATE INDEX "votes_student_id_candidate_list_id_idx" ON "votes"("student_id", "candidate_list_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_student_id_candidate_id_key" ON "votes"("student_id", "candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "winners_election_year_id_candidate_id_key" ON "winners"("election_year_id", "candidate_id");

-- AddForeignKey
ALTER TABLE "candidate_lists" ADD CONSTRAINT "candidate_lists_election_year_id_fkey" FOREIGN KEY ("election_year_id") REFERENCES "election_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_candidate_list_id_fkey" FOREIGN KEY ("candidate_list_id") REFERENCES "candidate_lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_candidate_list_id_fkey" FOREIGN KEY ("candidate_list_id") REFERENCES "candidate_lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winners" ADD CONSTRAINT "winners_election_year_id_fkey" FOREIGN KEY ("election_year_id") REFERENCES "election_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winners" ADD CONSTRAINT "winners_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winners" ADD CONSTRAINT "winners_candidate_list_id_fkey" FOREIGN KEY ("candidate_list_id") REFERENCES "candidate_lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winners" ADD CONSTRAINT "winners_promoted_by_admin_id_fkey" FOREIGN KEY ("promoted_by_admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

