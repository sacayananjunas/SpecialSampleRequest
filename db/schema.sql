-- PetroSync database schema (PostgreSQL / Neon).
-- Safe to run repeatedly: every object uses IF NOT EXISTS.

-- ---------- people ----------
CREATE TABLE IF NOT EXISTS users (
  id            serial PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  role          text NOT NULL DEFAULT 'requester' CHECK (role IN ('requester', 'analyst', 'supervisor')),
  department    text,
  title         text,
  site          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------- reference data ----------
CREATE TABLE IF NOT EXISTS process_units (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  full_name  text NOT NULL,
  points     text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tests (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  method       text NOT NULL,
  unit         text NOT NULL DEFAULT '',
  range_min    double precision NOT NULL,
  range_max    double precision NOT NULL,
  decimals     int NOT NULL DEFAULT 2,
  sample_types text[] NOT NULL DEFAULT '{}',
  min_volume   text,
  container    text,
  tat_hours    int NOT NULL,
  price        double precision NOT NULL,
  instrument   text,
  notes        text,
  sort_order   int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS specs (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  short_name text NOT NULL,
  label      text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS spec_limits (
  spec_id   text NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  test_id   text NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  min_value double precision,
  max_value double precision,
  nominal   double precision,
  PRIMARY KEY (spec_id, test_id)
);

CREATE TABLE IF NOT EXISTS packages (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  product    text NOT NULL,
  spec_id    text NOT NULL REFERENCES specs(id),
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS package_tests (
  package_id  text NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  test_id     text NOT NULL REFERENCES tests(id),
  order_index int NOT NULL,
  PRIMARY KEY (package_id, test_id)
);

CREATE TABLE IF NOT EXISTS instruments (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  model      text,
  status     text NOT NULL CHECK (status IN ('Online', 'In Use', 'Calibration Due', 'Down')),
  detail     text,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- sample requests ----------
CREATE SEQUENCE IF NOT EXISTS request_seq START 101;

CREATE TABLE IF NOT EXISTS requests (
  id             text PRIMARY KEY,                       -- e.g. PS-2026-00142
  requester_id   int NOT NULL REFERENCES users(id),
  requester_name text NOT NULL,
  department     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  site           text NOT NULL,
  unit_id        text NOT NULL REFERENCES process_units(id),
  sampling_point text NOT NULL,
  batch          text,
  cost_center    text NOT NULL,
  product        text NOT NULL,
  num_samples    int NOT NULL CHECK (num_samples BETWEEN 1 AND 20),
  sampled_at     timestamptz NOT NULL,
  sampled_by     text NOT NULL,
  volume         text NOT NULL,
  container      text NOT NULL,
  package_id     text REFERENCES packages(id),
  package_name   text NOT NULL,
  purpose        text NOT NULL,
  spec_id        text NOT NULL REFERENCES specs(id),
  flam_class     text NOT NULL,
  h2s            boolean NOT NULL DEFAULT false,
  h2s_ppm        double precision,
  pressurized    boolean NOT NULL DEFAULT false,
  norm           boolean NOT NULL DEFAULT false,
  storage        text NOT NULL,
  retain         boolean NOT NULL DEFAULT true,
  instructions   text,
  priority       text NOT NULL CHECK (priority IN ('Routine', 'Urgent', 'Critical')),
  attachments    jsonb NOT NULL DEFAULT '[]',
  status         text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'received', 'analysis', 'qc', 'certified')),
  status_at      timestamptz NOT NULL DEFAULT now(),
  due_at         timestamptz NOT NULL,
  retest_of      text REFERENCES requests(id)
);
CREATE INDEX IF NOT EXISTS requests_requester_idx ON requests (requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS requests_status_idx ON requests (status, due_at);
CREATE INDEX IF NOT EXISTS requests_unit_idx ON requests (unit_id);
CREATE INDEX IF NOT EXISTS requests_retest_idx ON requests (retest_of);

CREATE TABLE IF NOT EXISTS request_tests (
  request_id  text NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  test_id     text NOT NULL REFERENCES tests(id),
  order_index int NOT NULL,
  PRIMARY KEY (request_id, test_id)
);

CREATE TABLE IF NOT EXISTS results (
  request_id     text NOT NULL,
  test_id        text NOT NULL,
  value          double precision NOT NULL,
  entered_by     int REFERENCES users(id),
  entered_by_name text NOT NULL,
  entered_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, test_id),
  FOREIGN KEY (request_id, test_id) REFERENCES request_tests(request_id, test_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custody_events (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_id text NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  at         timestamptz NOT NULL DEFAULT now(),
  by_name    text NOT NULL,
  by_role    text NOT NULL,
  action     text NOT NULL,
  note       text
);
CREATE INDEX IF NOT EXISTS custody_request_idx ON custody_events (request_id, at);

CREATE TABLE IF NOT EXISTS comments (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_id text NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id    int REFERENCES users(id),
  by_name    text NOT NULL,
  by_role    text NOT NULL CHECK (by_role IN ('Requester', 'Lab')),
  body       text NOT NULL,
  at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_request_idx ON comments (request_id, at);

CREATE TABLE IF NOT EXISTS issues (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_id text NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  type       text NOT NULL,
  note       text,
  by_name    text NOT NULL,
  at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS issues_request_idx ON issues (request_id, at);

-- ---------- property trends (supervisor dashboard) ----------
CREATE TABLE IF NOT EXISTS trend_series (
  id          text PRIMARY KEY,
  label       text NOT NULL,
  unit        text NOT NULL DEFAULT '',
  method      text NOT NULL,
  limit_value double precision NOT NULL,
  limit_label text NOT NULL,
  is_min      boolean NOT NULL DEFAULT false,
  decimals    int NOT NULL DEFAULT 1,
  sort_order  int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS property_readings (
  series_id    text NOT NULL REFERENCES trend_series(id) ON DELETE CASCADE,
  reading_date date NOT NULL,
  value        double precision NOT NULL,
  PRIMARY KEY (series_id, reading_date)
);
