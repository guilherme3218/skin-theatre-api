-- =========================
-- DATABASE
-- =========================
CREATE DATABASE skin_theatre;

-- =========================
-- USER
-- =========================
CREATE USER skin_user WITH PASSWORD 'skin_user_admin_123';

GRANT ALL PRIVILEGES ON DATABASE skin_theatre TO skin_user;

-- =========================
-- CONNECT DATABASE
-- =========================
\c skin_theatre

-- =========================
-- EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- TABLE: users
-- =========================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  picture TEXT,

  roles TEXT[] NOT NULL DEFAULT ARRAY['user'],

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);