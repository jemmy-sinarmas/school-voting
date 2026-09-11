-- Role-based voting: introduces the list -> role -> candidate hierarchy and
-- moves the vote cap from a flat "2 per list" to "one vote per role".
--
-- This migration is written to be safe on a database that already holds
-- candidates and votes cast under the old flat-cap model:
--   1. create the roles table,
--   2. add nullable role_id columns to candidates and votes,
--   3. backfill a default role per existing list and point candidates/votes at it,
--   4. de-duplicate votes so the new one-vote-per-role unique can be applied
--      (historical lists allowed up to 2 votes per student in a single list,
--       which would collapse to >1 vote for the single backfilled role),
--   5. enforce NOT NULL + foreign keys + the new uniques,
--   6. drop the old enforce_vote_cap trigger/function (superseded by the
--      per-role unique constraint).

-- 1. Roles table -----------------------------------------------------------
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_list_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_candidate_list_id_name_key" ON "roles"("candidate_list_id", "name");
CREATE INDEX "roles_candidate_list_id_display_order_idx" ON "roles"("candidate_list_id", "display_order");

ALTER TABLE "roles"
    ADD CONSTRAINT "roles_candidate_list_id_fkey"
    FOREIGN KEY ("candidate_list_id") REFERENCES "candidate_lists"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Nullable role_id columns ----------------------------------------------
ALTER TABLE "candidates" ADD COLUMN "role_id" UUID;
ALTER TABLE "votes" ADD COLUMN "role_id" UUID;

-- 3. Backfill: one default role per list that currently has candidates ------
-- Named "General" so it is obvious in the UI that this is a migrated,
-- pre-roles list. Admins can rename/add roles on any future draft list.
INSERT INTO "roles" ("candidate_list_id", "name", "display_order")
SELECT DISTINCT "candidate_list_id", 'General', 0
FROM "candidates";

UPDATE "candidates" c
SET "role_id" = r."id"
FROM "roles" r
WHERE r."candidate_list_id" = c."candidate_list_id"
  AND r."name" = 'General';

UPDATE "votes" v
SET "role_id" = c."role_id"
FROM "candidates" c
WHERE c."id" = v."candidate_id";

-- 4. De-duplicate votes so one-vote-per-role holds on historical data -------
-- Keep the earliest vote for each (student, role); delete the rest. On a
-- fresh/seeded DB (re-seeded under the new model) this deletes nothing.
DELETE FROM "votes" v
USING (
    SELECT "id",
           ROW_NUMBER() OVER (
               PARTITION BY "student_id", "role_id"
               ORDER BY "created_at" ASC, "id" ASC
           ) AS rn
    FROM "votes"
    WHERE "role_id" IS NOT NULL
) dup
WHERE v."id" = dup."id" AND dup.rn > 1;

-- 5. Enforce NOT NULL + FKs + uniques --------------------------------------
ALTER TABLE "candidates" ALTER COLUMN "role_id" SET NOT NULL;
ALTER TABLE "votes" ALTER COLUMN "role_id" SET NOT NULL;

CREATE INDEX "candidates_role_id_idx" ON "candidates"("role_id");

ALTER TABLE "candidates"
    ADD CONSTRAINT "candidates_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "votes"
    ADD CONSTRAINT "votes_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "votes_student_id_role_id_key" ON "votes"("student_id", "role_id");

-- 6. Retire the old per-list vote-cap trigger ------------------------------
-- The "at most 2 votes per student per list" rule no longer exists; the
-- one-vote-per-role guarantee is now the DB unique above. Drop the trigger
-- and its function so no stale enforcement remains.
DROP TRIGGER IF EXISTS "enforce_vote_cap_before_insert" ON "votes";
DROP FUNCTION IF EXISTS enforce_vote_cap();
