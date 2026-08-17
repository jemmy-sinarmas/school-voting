-- "Grade" (e.g. "Year 12") was a K-12 concept left over from initial scaffolding;
-- this system is for a university, so candidates no longer carry a grade field.
ALTER TABLE "candidates" DROP COLUMN "grade";
