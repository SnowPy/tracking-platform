-- 埋点需求增强迁移 v2
-- 在 Supabase SQL Editor 中运行此文件

-- ============================================
-- 1. 需求表增加字段
-- ============================================
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT '{}';
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS trigger_timing TEXT;

-- ============================================
-- 2. 属性类型管理表
-- ============================================
CREATE TABLE IF NOT EXISTS public.property_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT DEFAULT '#1677ff',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 初始数据
INSERT INTO public.property_types (value, label, color, sort_order) VALUES
  ('string', 'string', '#1677ff', 1),
  ('number', 'number', '#52c41a', 2),
  ('boolean', 'boolean', '#faad14', 3),
  ('object', 'object', '#722ed1', 4),
  ('array', 'array', '#13c2c2', 5)
ON CONFLICT (value) DO NOTHING;

-- RLS
ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "property_types_read" ON public.property_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "property_types_write" ON public.property_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "property_types_update" ON public.property_types FOR UPDATE TO authenticated USING (true);
CREATE POLICY "property_types_delete" ON public.property_types FOR DELETE TO authenticated USING (true);
