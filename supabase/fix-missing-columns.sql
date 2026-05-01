-- Fix missing updated_at and created_at columns across all tables
-- Run this in Supabase SQL Editor

BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.borrow_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.borrow_requests ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.borrow_requests ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.borrow_requests ADD COLUMN IF NOT EXISTS returned_at timestamptz;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

COMMIT;
