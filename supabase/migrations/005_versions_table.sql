-- 版本管理表
-- 在 Supabase SQL Editor 中运行

CREATE TABLE IF NOT EXISTS public.versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 从已有需求中迁移版本数据
INSERT INTO public.versions (name)
SELECT DISTINCT version FROM public.requirements WHERE version IS NOT NULL AND version != ''
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "versions_read" ON public.versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "versions_write" ON public.versions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "versions_update" ON public.versions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "versions_delete" ON public.versions FOR DELETE TO authenticated USING (true);
