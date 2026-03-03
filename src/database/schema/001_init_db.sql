CREATE DATABASE skin_theatre;
CREATE USER skin_user WITH PASSWORD 'skin_user_admin_123';
GRANT ALL PRIVILEGES ON DATABASE skin_theatre TO skin_user;
\c skin_theatre

-- APP_RUNNER_START

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  picture TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND tableowner = current_user
  ) THEN
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS email VARCHAR(150),
      ADD COLUMN IF NOT EXISTS picture TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'UQ_users_email'
        AND conrelid = 'users'::regclass
    ) THEN
      ALTER TABLE users
        ADD CONSTRAINT "UQ_users_email" UNIQUE (email);
    END IF;
  END IF;
END $$;
