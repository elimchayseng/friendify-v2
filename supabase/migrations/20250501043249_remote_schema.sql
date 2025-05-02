SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "artist" "text" NOT NULL,
    "album" "text" NOT NULL,
    "image_url" "text",
    "spotify_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "is_track_of_day" boolean DEFAULT false
);
ALTER TABLE "public"."tracks" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."user_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "track_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "rank" integer
);
ALTER TABLE "public"."user_tracks" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" "text" NOT NULL,
    "spotify_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "current_track_id" "uuid"
);
ALTER TABLE "public"."users" OWNER TO "postgres";
ALTER TABLE ONLY "public"."tracks"
ADD CONSTRAINT "tracks_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."tracks"
ADD CONSTRAINT "tracks_spotify_id_key" UNIQUE ("spotify_id");
ALTER TABLE ONLY "public"."user_tracks"
ADD CONSTRAINT "user_tracks_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."user_tracks"
ADD CONSTRAINT "user_tracks_user_id_track_id_key" UNIQUE ("user_id", "track_id");
ALTER TABLE ONLY "public"."users"
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."users"
ADD CONSTRAINT "users_spotify_id_key" UNIQUE ("spotify_id");
ALTER TABLE ONLY "public"."user_tracks"
ADD CONSTRAINT "user_tracks_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."user_tracks"
ADD CONSTRAINT "user_tracks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."users"
ADD CONSTRAINT "users_current_track_id_fkey" FOREIGN KEY ("current_track_id") REFERENCES "public"."tracks"("id");
CREATE POLICY "Anyone can read tracks" ON "public"."tracks" FOR
SELECT;
CREATE POLICY "Enable anonymous access" ON "public"."tracks" USING (("auth"."role"() = 'anon'::"text"));
CREATE POLICY "Enable delete for own tracks" ON "public"."user_tracks" FOR DELETE USING (
    (
        ("auth"."uid"() = "user_id")
        OR ("auth"."uid"() IS NULL)
    )
);
CREATE POLICY "Enable delete for tracks" ON "public"."tracks" FOR DELETE USING (true);
CREATE POLICY "Enable delete for users based on user_id" ON "public"."user_tracks" FOR DELETE USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Enable insert access for all users" ON "public"."user_tracks" FOR
INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for new users" ON "public"."users" FOR
INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for own tracks" ON "public"."user_tracks" FOR
INSERT WITH CHECK (
        (
            ("auth"."uid"() = "user_id")
            OR ("auth"."uid"() IS NULL)
        )
    );
CREATE POLICY "Enable insert for tracks" ON "public"."tracks" FOR
INSERT WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON "public"."user_tracks" FOR
SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON "public"."users" FOR
SELECT USING (true);
CREATE POLICY "Enable read access for own tracks" ON "public"."user_tracks" FOR
SELECT USING (
        (
            ("auth"."uid"() = "user_id")
            OR ("auth"."uid"() IS NULL)
        )
    );
CREATE POLICY "Enable update for own profile" ON "public"."users" FOR
UPDATE USING (
        (
            ("auth"."uid"() = "id")
            OR ("auth"."uid"() IS NULL)
        )
    );
CREATE POLICY "Tracks are viewable by authenticated users" ON "public"."tracks" FOR
SELECT TO "authenticated" USING (true);
CREATE POLICY "Users can insert their own tracks" ON "public"."user_tracks" FOR
INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can insert their own user_tracks" ON "public"."user_tracks" FOR
INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can insert tracks" ON "public"."tracks" FOR
INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Users can read their own data" ON "public"."users" FOR
SELECT USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can read their own data." ON "public"."users" FOR
SELECT TO "authenticated" USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can read their own tracks" ON "public"."user_tracks" FOR
SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can read their own user_tracks" ON "public"."user_tracks" FOR
SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can update their own data" ON "public"."users" FOR
UPDATE USING (("auth"."uid"() = "id"));
ALTER TABLE "public"."tracks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_tracks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON TABLE "public"."tracks" TO "anon";
GRANT ALL ON TABLE "public"."tracks" TO "authenticated";
GRANT ALL ON TABLE "public"."tracks" TO "service_role";
GRANT ALL ON TABLE "public"."user_tracks" TO "anon";
GRANT ALL ON TABLE "public"."user_tracks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_tracks" TO "service_role";
GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "service_role";
RESET ALL;