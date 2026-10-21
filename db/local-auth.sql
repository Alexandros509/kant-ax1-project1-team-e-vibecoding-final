-- Local PGlite adapter only. Supabase already manages auth.users.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users(id UUID PRIMARY KEY);
