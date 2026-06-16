-- 事件和属性表增强：添加平台、触发时机、备注
-- 在 Supabase SQL Editor 中运行

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT '{}';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS trigger_timing TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.common_properties ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT '{}';
ALTER TABLE public.common_properties ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.user_properties ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT '{}';
ALTER TABLE public.user_properties ADD COLUMN IF NOT EXISTS notes TEXT;
