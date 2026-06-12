-- 埋点管理平台增强迁移
-- 在 Supabase SQL Editor 中运行此文件

-- ============================================
-- 1. 属性表增加显示名
-- ============================================
ALTER TABLE public.event_properties ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.user_properties ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.common_properties ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ============================================
-- 2. 需求表增加事件关联和修改类型
-- ============================================
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS modification_type TEXT DEFAULT 'new' CHECK (modification_type IN ('new', 'modify'));

-- ============================================
-- 3. 事件表增加描述字段扩展（如果已有则跳过）
-- ============================================
-- events 表已有 description，无需修改
