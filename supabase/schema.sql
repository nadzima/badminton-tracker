-- ============================================================
-- Shuttle Track – Supabase Schema
-- Run this in Supabase SQL Editor (Database > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- Players
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.players (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Sessions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  location    TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Session ↔ Player junction
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_players (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id  UUID NOT NULL REFERENCES public.sessions(id)  ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES public.players(id)   ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, player_id)
);

-- ------------------------------------------------------------
-- Matches
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matches (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id          UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  match_number        INTEGER NOT NULL,
  court               TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'in_progress', 'completed')),

  team1_player1_id    UUID REFERENCES public.players(id),
  team1_player2_id    UUID REFERENCES public.players(id),
  team2_player1_id    UUID REFERENCES public.players(id),
  team2_player2_id    UUID REFERENCES public.players(id),

  team1_score         INTEGER,
  team2_score         INTEGER,
  winner_team         INTEGER CHECK (winner_team IN (1, 2)),

  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Row Level Security – open policy for single-club use
-- (enable RLS but allow all authenticated + anon reads/writes)
-- ------------------------------------------------------------
ALTER TABLE public.players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches       ENABLE ROW LEVEL SECURITY;

-- Allow all operations for everyone (adjust if you need auth later)
CREATE POLICY "allow_all" ON public.players        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.sessions       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.session_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.matches        FOR ALL USING (true) WITH CHECK (true);
