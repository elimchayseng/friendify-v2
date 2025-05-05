-- Add Spotify token columns to users table
ALTER TABLE "public"."users"
ADD COLUMN if not exists "access_token" TEXT,
    ADD COLUMN if not exists "refresh_token" TEXT,
    ADD COLUMN if not exists "token_expires_at" TIMESTAMP WITH TIME ZONE;
-- Update the database.types.ts to match
COMMENT ON COLUMN "public"."users"."access_token" IS 'Spotify access token';
COMMENT ON COLUMN "public"."users"."refresh_token" IS 'Spotify refresh token';
COMMENT ON COLUMN "public"."users"."token_expires_at" IS 'When the access token expires';