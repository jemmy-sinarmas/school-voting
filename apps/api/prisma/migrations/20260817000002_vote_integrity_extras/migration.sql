-- Vote-integrity backstops that cannot be expressed in schema.prisma:
-- (1) a partial unique index guaranteeing at most one candidate_lists row
--     can be 'active' system-wide, and
-- (2) a BEFORE INSERT trigger on votes that independently re-derives and
--     enforces the "at most 2 votes per student per list" cap, so the
--     guarantee holds even if a future code path bypasses the
--     application-level advisory-lock transaction in VotesService.

-- (1) Single-active-list-system-wide guarantee
CREATE UNIQUE INDEX "one_active_list_system_wide"
ON "candidate_lists" ((status))
WHERE status = 'active';

-- (2) Vote-cap trigger backstop
CREATE OR REPLACE FUNCTION enforce_vote_cap() RETURNS trigger AS $$
DECLARE
  existing_count integer;
BEGIN
  SELECT count(*) INTO existing_count
  FROM "votes"
  WHERE student_id = NEW.student_id
    AND candidate_list_id = NEW.candidate_list_id;

  IF existing_count >= 2 THEN
    RAISE EXCEPTION 'Vote cap exceeded: student % already has % votes for list %',
      NEW.student_id, existing_count, NEW.candidate_list_id
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_vote_cap_before_insert
BEFORE INSERT ON "votes"
FOR EACH ROW
EXECUTE FUNCTION enforce_vote_cap();
