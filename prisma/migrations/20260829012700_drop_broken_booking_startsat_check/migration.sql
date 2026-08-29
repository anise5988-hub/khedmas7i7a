-- The "Booking_startsAt_check" CHECK ("startsAt" > CURRENT_TIMESTAMP), added in
-- 20260822130000_add_constraints_and_settings, was meant as defense-in-depth
-- against creating a booking in the past (already enforced at the API layer
-- in src/app/api/bookings/route.ts). But Postgres re-validates CHECK
-- constraints against the WHOLE row on every UPDATE, not just when the
-- checked column changes — so once a booking's startsAt passed, ANY update
-- to that row (including the classroom lifecycle's own status: CONFIRMED ->
-- COMPLETED cascade in src/lib/server/classroom-session.ts) started failing.
-- Result: zero bookings had ever reached COMPLETED in production.
ALTER TABLE "public"."Booking" DROP CONSTRAINT IF EXISTS "Booking_startsAt_check";
