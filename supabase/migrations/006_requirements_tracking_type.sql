-- 埋点需求类型增强
-- 添加 tracking_type（埋点类型）和 display_name（显示名）

ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS tracking_type TEXT DEFAULT 'event';
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS display_name TEXT;
