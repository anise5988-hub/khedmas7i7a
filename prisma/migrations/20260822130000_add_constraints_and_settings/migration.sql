ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_rating_check" CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE "public"."WalletTransaction" ADD CONSTRAINT "WalletTransaction_amountMillimes_check" CHECK ("amountMillimes" <> 0);
ALTER TABLE "public"."WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_requestedMillimes_check" CHECK ("requestedMillimes" > 0);
ALTER TABLE "public"."WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_feeMillimes_check" CHECK ("feeMillimes" > 0);
ALTER TABLE "public"."WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_payoutMillimes_check" CHECK ("payoutMillimes" > 0);
ALTER TABLE "public"."WalletDeposit" ADD CONSTRAINT "WalletDeposit_amountMillimes_check" CHECK ("amountMillimes" > 0);
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_durationMinutes_check" CHECK ("durationMinutes" > 0);
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_startsAt_check" CHECK ("startsAt" > CURRENT_TIMESTAMP);
ALTER TABLE "public"."Course" ADD CONSTRAINT "Course_visibility_check" CHECK ("visibility" IN ('PUBLIC','LOCKED','PRIVATE','DRAFT'));
ALTER TABLE "public"."TeacherProfile" ADD CONSTRAINT "TeacherProfile_hourlyRateMillimes_check" CHECK ("hourlyRateMillimes" > 0);
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_amountMillimes_check" CHECK ("amountMillimes" > 0);

CREATE TABLE "public"."PlatformSettings" (
  "id" TEXT NOT NULL,
  "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "minWithdrawalTnd" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "d17Enabled" BOOLEAN NOT NULL DEFAULT true,
  "flouciEnabled" BOOLEAN NOT NULL DEFAULT true,
  "bankTransferEnabled" BOOLEAN NOT NULL DEFAULT true,
  "supportEmail" TEXT NOT NULL DEFAULT 'profyspace@gmail.com',
  "supportPhone" TEXT NOT NULL DEFAULT '+216 58 249 938',
  "d17Recipient" TEXT,
  "flouciRecipient" TEXT,
  "bankRib" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "public"."PlatformSettings" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);
