-- PinCanvas: Neon Database Migration
-- Consolidated from Supabase migrations
-- Run this against your Neon database to set up the schema
--
-- NOTE: This creates only the data tables. Supabase-specific auth
-- (auth.users, auth.uid(), RLS policies) are NOT included.
-- You will need a backend API layer to handle authentication and
-- authorization when using Neon directly.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

------------------------------------------------------------
-- TABLES
------------------------------------------------------------

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Canvases
CREATE TABLE IF NOT EXISTS public.canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_public BOOLEAN NOT NULL DEFAULT false,
  public_permission TEXT DEFAULT 'viewer' CHECK (public_permission IN ('viewer', 'editor')),
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  allow_likes BOOLEAN NOT NULL DEFAULT true,
  background_type TEXT DEFAULT 'color' CHECK (background_type IN ('color', 'image')),
  background_color TEXT DEFAULT '#ffffff',
  background_image_url TEXT,
  image_width INTEGER,
  image_height INTEGER
);

CREATE INDEX IF NOT EXISTS idx_canvases_dimensions
  ON public.canvases (image_width, image_height)
  WHERE image_width IS NOT NULL AND image_height IS NOT NULL;

-- 3. Layers
CREATE TABLE IF NOT EXISTS public.layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  canvas_id UUID NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked BOOLEAN NOT NULL DEFAULT false
);

-- 4. Pin Templates
CREATE TABLE IF NOT EXISTS public.pin_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  shape TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  size TEXT NOT NULL DEFAULT 'medium',
  icon TEXT,
  style JSONB,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  image_url TEXT DEFAULT NULL
);

-- 5. Pins
CREATE TABLE IF NOT EXISTS public.pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  layer_id UUID NOT NULL REFERENCES public.layers(id) ON DELETE CASCADE,
  canvas_id UUID NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  template_id UUID REFERENCES public.pin_templates(id) DEFAULT NULL
);

-- 6. Media Items
CREATE TABLE IF NOT EXISTS public.media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'url')),
  url TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Canvas Shares
CREATE TABLE IF NOT EXISTS public.canvas_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'editor')),
  shared_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(canvas_id, shared_with_email)
);

-- 8. Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  author_email TEXT,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Likes
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  author_email TEXT,
  author_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pin_id, author_email)
);

-- 10. Drawings
CREATE TABLE IF NOT EXISTS public.drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL,
  layer_id UUID NOT NULL,
  drawing_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

------------------------------------------------------------
-- VIEWS
------------------------------------------------------------

CREATE OR REPLACE VIEW public.secure_comments AS
SELECT id, pin_id, content, author_name, author_email, created_at, updated_at
FROM public.comments;

CREATE OR REPLACE VIEW public.secure_likes AS
SELECT id, pin_id, author_name, author_email, created_at
FROM public.likes;

------------------------------------------------------------
-- FUNCTIONS
------------------------------------------------------------

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

------------------------------------------------------------
-- TRIGGERS
------------------------------------------------------------

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_canvases_updated_at
  BEFORE UPDATE ON public.canvases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pins_updated_at
  BEFORE UPDATE ON public.pins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pin_templates_updated_at
  BEFORE UPDATE ON public.pin_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drawings_updated_at
  BEFORE UPDATE ON public.drawings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

------------------------------------------------------------
-- DEFAULT DATA
------------------------------------------------------------

INSERT INTO public.pin_templates (name, shape, color, size, icon, is_default, is_public, style) VALUES
  ('기본 핀', 'pin', '#3b82f6', 'medium', 'MapPin', true, true, '{"borderRadius": "50%"}'),
  ('별표', 'star', '#eab308', 'medium', 'Star', true, true, '{"borderRadius": "0%"}'),
  ('하트', 'heart', '#ef4444', 'medium', 'Heart', true, true, '{"borderRadius": "0%"}'),
  ('체크', 'check', '#22c55e', 'medium', 'Check', true, true, '{"borderRadius": "50%"}'),
  ('경고', 'warning', '#f97316', 'medium', 'AlertTriangle', true, true, '{"borderRadius": "0%"}'),
  ('정보', 'info', '#06b6d4', 'medium', 'Info', true, true, '{"borderRadius": "50%"}'),
  ('북마크', 'bookmark', '#8b5cf6', 'medium', 'Bookmark', true, true, '{"borderRadius": "0%"}')
ON CONFLICT DO NOTHING;
