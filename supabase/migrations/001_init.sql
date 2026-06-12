-- 埋点管理平台数据库迁移
-- 在 Supabase SQL Editor 中运行此文件

-- ============================================
-- 1. 创建 profiles 表（扩展 Supabase auth.users）
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (NEW.id, NEW.email, 'member');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. 事件分类表
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. 埋点事件表
-- ============================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'deprecated')),
  version INT DEFAULT 1,
  changelog TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. 事件属性表
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'object', 'array')),
  description TEXT,
  required BOOLEAN DEFAULT false,
  example_value TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. 用户属性表
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'object', 'array')),
  description TEXT,
  example_value TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. 公共属性表
-- ============================================
CREATE TABLE IF NOT EXISTS public.common_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'object', 'array')),
  description TEXT,
  example_value TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. 埋点需求工单表
-- ============================================
CREATE TABLE IF NOT EXISTS public.requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_name TEXT,
  proposed_properties JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  requester_id UUID REFERENCES public.profiles(id),
  assignee_id UUID REFERENCES public.profiles(id),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 8. Row Level Security 策略
-- ============================================

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_write" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "categories_update" ON public.categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "categories_delete" ON public.categories FOR DELETE TO authenticated USING (true);

-- events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_read" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_write" ON public.events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "events_update" ON public.events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "events_delete" ON public.events FOR DELETE TO authenticated USING (true);

-- event_properties
ALTER TABLE public.event_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_properties_read" ON public.event_properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "event_properties_write" ON public.event_properties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "event_properties_update" ON public.event_properties FOR UPDATE TO authenticated USING (true);
CREATE POLICY "event_properties_delete" ON public.event_properties FOR DELETE TO authenticated USING (true);

-- user_properties
ALTER TABLE public.user_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_properties_read" ON public.user_properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_properties_write" ON public.user_properties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_properties_update" ON public.user_properties FOR UPDATE TO authenticated USING (true);
CREATE POLICY "user_properties_delete" ON public.user_properties FOR DELETE TO authenticated USING (true);

-- common_properties
ALTER TABLE public.common_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "common_properties_read" ON public.common_properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "common_properties_write" ON public.common_properties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "common_properties_update" ON public.common_properties FOR UPDATE TO authenticated USING (true);
CREATE POLICY "common_properties_delete" ON public.common_properties FOR DELETE TO authenticated USING (true);

-- requirements
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requirements_read" ON public.requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "requirements_write" ON public.requirements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "requirements_update" ON public.requirements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "requirements_delete" ON public.requirements FOR DELETE TO authenticated USING (true);

-- ============================================
-- 9. 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_name ON public.events(name);
CREATE INDEX IF NOT EXISTS idx_event_properties_event ON public.event_properties(event_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON public.requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_requester ON public.requirements(requester_id);
