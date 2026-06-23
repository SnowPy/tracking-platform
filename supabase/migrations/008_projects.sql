-- 多项目支持迁移
-- 在 Supabase SQL Editor 中运行此文件

-- ============================================
-- 1. 创建 projects 表
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. 插入默认项目
-- ============================================
INSERT INTO public.projects (id, name, description) VALUES
  ('00000000-0000-4000-8000-000000000001', '熊猫睡眠', '熊猫睡眠健康监测项目'),
  ('00000000-0000-4000-8000-000000000002', 'NOW', 'NOW 项目')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. 为所有业务表添加 project_id 列（先 nullable）
-- ============================================
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.event_properties ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.user_properties ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.common_properties ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.property_types ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.versions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- ============================================
-- 4. 将现有数据迁移到"熊猫睡眠"项目
-- ============================================
UPDATE public.events SET project_id = '00000000-0000-4000-8000-000000000001' WHERE project_id IS NULL;
UPDATE public.categories SET project_id = '00000000-0000-4000-8000-000000000001' WHERE project_id IS NULL;
UPDATE public.event_properties SET project_id = '00000000-0000-4000-8000-000000000001' WHERE project_id IS NULL;
UPDATE public.user_properties SET project_id = '00000000-0000-4000-8000-000000000001' WHERE project_id IS NULL;
UPDATE public.common_properties SET project_id = '00000000-0000-4000-8000-000000000001' WHERE project_id IS NULL;
UPDATE public.requirements SET project_id = '00000000-0000-4000-8000-000000000001' WHERE project_id IS NULL;
UPDATE public.property_types SET project_id = '00000000-0000-4000-8000-000000000001' WHERE project_id IS NULL;
UPDATE public.versions SET project_id = '00000000-0000-4000-8000-000000000001' WHERE project_id IS NULL;

-- ============================================
-- 5. 将 project_id 设为 NOT NULL
-- ============================================
ALTER TABLE public.events ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.event_properties ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.user_properties ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.common_properties ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.requirements ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.property_types ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.versions ALTER COLUMN project_id SET NOT NULL;

-- ============================================
-- 6. 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_events_project ON public.events(project_id);
CREATE INDEX IF NOT EXISTS idx_categories_project ON public.categories(project_id);
CREATE INDEX IF NOT EXISTS idx_event_properties_project ON public.event_properties(project_id);
CREATE INDEX IF NOT EXISTS idx_user_properties_project ON public.user_properties(project_id);
CREATE INDEX IF NOT EXISTS idx_common_properties_project ON public.common_properties(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_project ON public.requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_property_types_project ON public.property_types(project_id);
CREATE INDEX IF NOT EXISTS idx_versions_project ON public.versions(project_id);

-- ============================================
-- 7. RLS
-- ============================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_read" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_write" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated USING (true);
