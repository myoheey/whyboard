-- ============================================================
-- WhyBoard (PinCanvas) - 통합 데이터베이스 스키마
-- 새 Supabase 프로젝트의 SQL Editor에서 이 스크립트를 실행하세요.
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. FUNCTIONS (테이블 생성 전에 필요한 함수들)
-- ============================================================

-- 2-1. updated_at 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2-2. 현재 사용자 이메일 조회
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- 2-3. 회원가입 시 프로필 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

-- 2-4. 캔버스 접근 권한 확인
CREATE OR REPLACE FUNCTION public.user_has_canvas_access(canvas_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 캔버스 소유자 확인
  IF EXISTS (
    SELECT 1 FROM public.canvases
    WHERE id = canvas_id AND owner_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- 공개 캔버스 확인
  IF EXISTS (
    SELECT 1 FROM public.canvases
    WHERE id = canvas_id AND is_public = true
  ) THEN
    RETURN TRUE;
  END IF;

  -- 공유 접근 확인
  IF EXISTS (
    SELECT 1 FROM public.canvas_shares cs
    JOIN auth.users u ON u.email = cs.shared_with_email
    WHERE cs.canvas_id = canvas_id AND u.id = user_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2-5. 캔버스 권한 레벨 확인
CREATE OR REPLACE FUNCTION public.user_has_canvas_access_with_permission(canvas_id UUID, user_id UUID, required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 캔버스 소유자 (모든 권한)
  IF EXISTS (
    SELECT 1 FROM public.canvases
    WHERE id = canvas_id AND owner_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- 공개 캔버스 권한 확인
  IF EXISTS (
    SELECT 1 FROM public.canvases
    WHERE id = canvas_id
    AND is_public = true
    AND (
      required_permission = 'viewer'
      OR (required_permission = 'editor' AND public_permission = 'editor')
    )
  ) THEN
    RETURN TRUE;
  END IF;

  -- 공유 권한 확인
  IF EXISTS (
    SELECT 1 FROM public.canvas_shares cs
    JOIN auth.users u ON u.email = cs.shared_with_email
    WHERE cs.canvas_id = canvas_id
    AND u.id = user_id
    AND (
      required_permission = 'viewer'
      OR (required_permission = 'editor' AND cs.permission = 'editor')
    )
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2-6. 이메일 열람 권한 확인
CREATE OR REPLACE FUNCTION public.user_can_see_emails_for_canvas(canvas_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM canvases
    WHERE canvases.id = canvas_id
    AND (
      canvases.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM canvas_shares
        WHERE canvas_shares.canvas_id = canvases.id
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  );
END;
$$;

-- ============================================================
-- 3. TABLES
-- ============================================================

-- 3-1. profiles (사용자 프로필)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 3-2. canvases (캔버스)
CREATE TABLE public.canvases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  public_permission TEXT DEFAULT 'viewer' CHECK (public_permission IN ('viewer', 'editor')),
  allow_comments BOOLEAN NOT NULL DEFAULT TRUE,
  allow_likes BOOLEAN NOT NULL DEFAULT TRUE,
  background_type TEXT DEFAULT 'color' CHECK (background_type IN ('color', 'image')),
  background_color TEXT DEFAULT '#ffffff',
  background_image_url TEXT,
  image_width INTEGER,
  image_height INTEGER
);

CREATE INDEX IF NOT EXISTS idx_canvases_dimensions
  ON canvases(image_width, image_height)
  WHERE image_width IS NOT NULL AND image_height IS NOT NULL;

COMMENT ON COLUMN canvases.image_width IS 'Width of the canvas background image in pixels';
COMMENT ON COLUMN canvases.image_height IS 'Height of the canvas background image in pixels';

-- 3-3. layers (레이어)
CREATE TABLE public.layers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  canvas_id UUID NOT NULL REFERENCES public.canvases ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3-4. pin_templates (핀 템플릿)
CREATE TABLE public.pin_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  shape TEXT NOT NULL,  -- 'circle', 'square', 'triangle', 'star', 'heart', 'custom'
  color TEXT NOT NULL DEFAULT '#3b82f6',
  size TEXT NOT NULL DEFAULT 'medium',  -- 'small', 'medium', 'large'
  icon TEXT,
  style JSONB,
  image_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3-5. pins (핀)
CREATE TABLE public.pins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  layer_id UUID NOT NULL REFERENCES public.layers ON DELETE CASCADE,
  canvas_id UUID NOT NULL REFERENCES public.canvases ON DELETE CASCADE,
  template_id UUID REFERENCES public.pin_templates(id) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3-6. media_items (미디어 아이템)
CREATE TABLE public.media_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_id UUID NOT NULL REFERENCES public.pins ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'url')),
  url TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3-7. canvas_shares (캔버스 공유)
CREATE TABLE public.canvas_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id UUID NOT NULL REFERENCES public.canvases ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'editor')),
  shared_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(canvas_id, shared_with_email)
);

-- 3-8. comments (댓글)
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_id UUID NOT NULL REFERENCES public.pins ON DELETE CASCADE,
  author_email TEXT,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3-9. likes (좋아요)
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_id UUID NOT NULL REFERENCES public.pins ON DELETE CASCADE,
  author_email TEXT,
  author_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pin_id, author_email)
);

-- 3-10. drawings (드로잉 데이터)
CREATE TABLE public.drawings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id UUID NOT NULL,
  layer_id UUID NOT NULL,
  drawing_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

-- 회원가입 시 프로필 자동 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- updated_at 자동 갱신 트리거
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

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS) 활성화
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- -------------------- profiles --------------------
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- -------------------- canvases --------------------
CREATE POLICY "Users can view accessible canvases"
  ON public.canvases FOR SELECT
  USING (owner_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create their own canvases"
  ON public.canvases FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own canvases"
  ON public.canvases FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own canvases"
  ON public.canvases FOR DELETE
  USING (owner_id = auth.uid());

-- -------------------- layers --------------------
CREATE POLICY "Users can view layers of accessible canvases"
  ON public.layers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = layers.canvas_id
      AND (
        canvases.owner_id = auth.uid()
        OR canvases.is_public = true
        OR EXISTS (
          SELECT 1 FROM canvas_shares
          WHERE canvas_shares.canvas_id = canvases.id
          AND canvas_shares.shared_with_email = public.get_current_user_email()
        )
      )
    )
  );

CREATE POLICY "Users can modify layers of canvases they own or have editor access"
  ON public.layers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = layers.canvas_id
      AND (
        canvases.owner_id = auth.uid()
        OR (canvases.is_public = true AND canvases.public_permission = 'editor')
        OR EXISTS (
          SELECT 1 FROM canvas_shares
          WHERE canvas_shares.canvas_id = canvases.id
          AND canvas_shares.shared_with_email = public.get_current_user_email()
          AND canvas_shares.permission = 'editor'
        )
      )
    )
  );

-- -------------------- pins --------------------
CREATE POLICY "Users can view pins of accessible canvases"
  ON public.pins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = pins.canvas_id
      AND (
        canvases.owner_id = auth.uid()
        OR canvases.is_public = true
        OR EXISTS (
          SELECT 1 FROM canvas_shares
          WHERE canvas_shares.canvas_id = canvases.id
          AND canvas_shares.shared_with_email = public.get_current_user_email()
        )
      )
    )
  );

CREATE POLICY "Users can modify pins of canvases they own or have editor access"
  ON public.pins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = pins.canvas_id
      AND (
        canvases.owner_id = auth.uid()
        OR (canvases.is_public = true AND canvases.public_permission = 'editor')
        OR EXISTS (
          SELECT 1 FROM canvas_shares
          WHERE canvas_shares.canvas_id = canvases.id
          AND canvas_shares.shared_with_email = public.get_current_user_email()
          AND canvas_shares.permission = 'editor'
        )
      )
    )
  );

-- -------------------- media_items --------------------
CREATE POLICY "Users can view media items of accessible pins"
  ON public.media_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pins
      JOIN canvases ON canvases.id = pins.canvas_id
      WHERE pins.id = media_items.pin_id
      AND (
        canvases.owner_id = auth.uid()
        OR canvases.is_public = true
        OR EXISTS (
          SELECT 1 FROM canvas_shares
          WHERE canvas_shares.canvas_id = canvases.id
          AND canvas_shares.shared_with_email = public.get_current_user_email()
        )
      )
    )
  );

CREATE POLICY "Users can modify media items of pins they have editor access to"
  ON public.media_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pins
      JOIN canvases ON canvases.id = pins.canvas_id
      WHERE pins.id = media_items.pin_id
      AND (
        canvases.owner_id = auth.uid()
        OR (canvases.is_public = true AND canvases.public_permission = 'editor')
        OR EXISTS (
          SELECT 1 FROM canvas_shares
          WHERE canvas_shares.canvas_id = canvases.id
          AND canvas_shares.shared_with_email = public.get_current_user_email()
          AND canvas_shares.permission = 'editor'
        )
      )
    )
  );

-- -------------------- canvas_shares --------------------
CREATE POLICY "Canvas owners can view their canvas shares"
  ON public.canvas_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = canvas_shares.canvas_id
      AND canvases.owner_id = auth.uid()
    )
  );

CREATE POLICY "Shared users can view their own share"
  ON public.canvas_shares FOR SELECT
  USING (shared_with_email = get_current_user_email());

CREATE POLICY "Canvas owners can create shares for their canvases"
  ON public.canvas_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = canvas_shares.canvas_id
      AND canvases.owner_id = auth.uid()
    )
  );

CREATE POLICY "Canvas owners can delete shares from their canvases"
  ON public.canvas_shares FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = canvas_shares.canvas_id
      AND canvases.owner_id = auth.uid()
    )
  );

-- -------------------- comments --------------------
CREATE POLICY "Users can view comments on accessible pins"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pins
      JOIN canvases ON canvases.id = pins.canvas_id
      WHERE pins.id = comments.pin_id
      AND (
        canvases.owner_id = auth.uid()
        OR canvases.is_public = true
        OR EXISTS (
          SELECT 1 FROM canvas_shares
          WHERE canvas_shares.canvas_id = canvases.id
          AND canvas_shares.shared_with_email = get_current_user_email()
        )
      )
    )
  );

CREATE POLICY "Users can create comments on accessible pins"
  ON public.comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pins
      JOIN canvases ON canvases.id = pins.canvas_id
      WHERE pins.id = comments.pin_id
      AND canvases.allow_comments = true
      AND (
        canvases.is_public = true
        OR (
          auth.uid() IS NOT NULL AND (
            canvases.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM canvas_shares
              WHERE canvas_shares.canvas_id = canvases.id
              AND canvas_shares.shared_with_email = get_current_user_email()
            )
          )
        )
      )
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (
    author_email = get_current_user_email()
    OR EXISTS (
      SELECT 1 FROM pins
      JOIN canvases ON canvases.id = pins.canvas_id
      WHERE pins.id = comments.pin_id
      AND canvases.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own comments or canvas owners can delete"
  ON public.comments FOR DELETE
  TO authenticated
  USING (
    author_email = get_current_user_email()
    OR EXISTS (
      SELECT 1 FROM pins
      JOIN canvases ON canvases.id = pins.canvas_id
      WHERE pins.id = comments.pin_id
      AND canvases.owner_id = auth.uid()
    )
  );

-- -------------------- likes --------------------
CREATE POLICY "Users can view likes on accessible pins"
  ON public.likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pins
      JOIN canvases ON canvases.id = pins.canvas_id
      WHERE pins.id = likes.pin_id
      AND (
        canvases.owner_id = auth.uid()
        OR canvases.is_public = true
        OR EXISTS (
          SELECT 1 FROM canvas_shares
          WHERE canvas_shares.canvas_id = canvases.id
          AND canvas_shares.shared_with_email = get_current_user_email()
        )
      )
    )
  );

CREATE POLICY "Users can create likes on accessible pins"
  ON public.likes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pins
      JOIN canvases ON canvases.id = pins.canvas_id
      WHERE pins.id = likes.pin_id
      AND canvases.allow_likes = true
      AND (
        canvases.is_public = true
        OR (
          auth.uid() IS NOT NULL AND (
            canvases.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM canvas_shares
              WHERE canvas_shares.canvas_id = canvases.id
              AND canvas_shares.shared_with_email = get_current_user_email()
            )
          )
        )
      )
    )
  );

CREATE POLICY "Users can delete their own likes"
  ON public.likes FOR DELETE
  TO authenticated
  USING (author_email = get_current_user_email());

-- -------------------- pin_templates --------------------
CREATE POLICY "Anyone can view pin templates"
  ON public.pin_templates FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own pin templates"
  ON public.pin_templates FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own pin templates"
  ON public.pin_templates FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own pin templates"
  ON public.pin_templates FOR DELETE
  USING (created_by = auth.uid());

-- -------------------- drawings --------------------
CREATE POLICY "Users can view drawings of accessible canvases"
  ON public.drawings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = drawings.canvas_id
      AND (
        canvases.owner_id = auth.uid()
        OR canvases.is_public = true
        OR EXISTS (
          SELECT 1 FROM canvas_shares
          WHERE canvas_shares.canvas_id = canvases.id
          AND canvas_shares.shared_with_email = get_current_user_email()
        )
      )
    )
  );

CREATE POLICY "Users can insert drawings on accessible canvases"
  ON public.drawings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = drawings.canvas_id
      AND (
        canvases.owner_id = auth.uid()
        OR (canvases.is_public = true AND canvases.public_permission = 'editor')
        OR EXISTS (
          SELECT 1 FROM canvas_shares
          WHERE canvas_shares.canvas_id = canvases.id
          AND canvas_shares.shared_with_email = get_current_user_email()
          AND canvas_shares.permission = 'editor'
        )
      )
    )
  );

CREATE POLICY "Users can update drawings on accessible canvases"
  ON public.drawings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = drawings.canvas_id
      AND (
        canvases.owner_id = auth.uid()
        OR (canvases.is_public = true AND canvases.public_permission = 'editor')
        OR EXISTS (
          SELECT 1 FROM canvas_shares
          WHERE canvas_shares.canvas_id = canvases.id
          AND canvas_shares.shared_with_email = get_current_user_email()
          AND canvas_shares.permission = 'editor'
        )
      )
    )
  );

CREATE POLICY "Users can delete drawings on accessible canvases"
  ON public.drawings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = drawings.canvas_id
      AND (
        canvases.owner_id = auth.uid()
        OR (canvases.is_public = true AND canvases.public_permission = 'editor')
        OR EXISTS (
          SELECT 1 FROM canvas_shares
          WHERE canvas_shares.canvas_id = canvases.id
          AND canvas_shares.shared_with_email = get_current_user_email()
          AND canvas_shares.permission = 'editor'
        )
      )
    )
  );

-- ============================================================
-- 7. VIEWS
-- ============================================================

-- secure_comments: 이메일 조건부 노출
CREATE OR REPLACE VIEW public.secure_comments AS
SELECT
  id,
  pin_id,
  content,
  author_name,
  author_email,
  created_at,
  updated_at
FROM public.comments;

-- secure_likes: 이메일 조건부 노출
CREATE OR REPLACE VIEW public.secure_likes AS
SELECT
  id,
  pin_id,
  author_name,
  author_email,
  created_at
FROM public.likes;

-- Grant view access
GRANT SELECT ON public.secure_comments TO authenticated, anon;
GRANT SELECT ON public.secure_likes TO authenticated, anon;

-- ============================================================
-- 8. PERMISSIONS (Grant)
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.drawings TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_see_emails_for_canvas(UUID) TO authenticated;

-- ============================================================
-- 9. STORAGE BUCKETS
-- ============================================================

-- 9-1. pin-templates 버킷 (핀 템플릿 이미지)
INSERT INTO storage.buckets (id, name, public)
VALUES ('pin-templates', 'pin-templates', true);

CREATE POLICY "Users can view pin template images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pin-templates');

CREATE POLICY "Users can upload pin template images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pin-templates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own pin template images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'pin-templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own pin template images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pin-templates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 9-2. canvas-backgrounds 버킷 (캔버스 배경 및 미디어)
INSERT INTO storage.buckets (id, name, public)
VALUES ('canvas-backgrounds', 'canvas-backgrounds', true);

CREATE POLICY "Public read access to canvas-backgrounds"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'canvas-backgrounds');

CREATE POLICY "Public upload to canvas-backgrounds media folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'canvas-backgrounds'
    AND (
      -- 캔버스 배경 이미지 (인증 필요)
      (auth.uid() IS NOT NULL AND name ~ '^[a-f0-9\-]+/.*\.(jpg|jpeg|png|gif|webp)$')
      OR
      -- media/ 폴더 (공개 접근)
      name ~ '^media/.*\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|avi|ogg)$'
    )
  );

CREATE POLICY "Authenticated users can update canvas-backgrounds objects"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'canvas-backgrounds' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public delete from canvas-backgrounds media folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'canvas-backgrounds'
    AND (
      -- 캔버스 배경 이미지 (인증 필요)
      (auth.uid() IS NOT NULL AND name ~ '^[a-f0-9\-]+/.*\.(jpg|jpeg|png|gif|webp)$')
      OR
      -- media/ 폴더 (공개 접근)
      name ~ '^media/.*\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|avi|ogg)$'
    )
  );

-- ============================================================
-- 10. DEFAULT DATA (기본 핀 템플릿)
-- ============================================================
INSERT INTO public.pin_templates (name, description, shape, color, size, is_default, is_public) VALUES
  ('기본 원형', '기본 원형 핀', 'circle', '#3b82f6', 'medium', true, true),
  ('작은 원형', '작은 원형 핀', 'circle', '#3b82f6', 'small', false, true),
  ('큰 원형', '큰 원형 핀', 'circle', '#3b82f6', 'large', false, true),
  ('사각형', '사각형 핀', 'square', '#10b981', 'medium', false, true),
  ('삼각형', '삼각형 핀', 'triangle', '#f59e0b', 'medium', false, true),
  ('별모양', '별모양 핀', 'star', '#ef4444', 'medium', false, true),
  ('하트', '하트모양 핀', 'heart', '#ec4899', 'medium', false, true);

-- ============================================================
-- 완료! 새 Supabase 프로젝트에서 이 SQL을 실행한 후:
-- 1. .env 파일에서 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 변경
-- 2. Google OAuth가 필요하면 새 프로젝트의 Authentication > Providers에서 설정
-- ============================================================
