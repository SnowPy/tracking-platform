-- 级联更新属性类型
-- 在 Supabase SQL Editor 中运行此文件

CREATE OR REPLACE FUNCTION public.update_property_type_value(
  old_value TEXT,
  new_value TEXT
) RETURNS void AS $$
BEGIN
  UPDATE public.event_properties SET type = new_value, updated_at = now() WHERE type = old_value;
  UPDATE public.user_properties SET type = new_value, updated_at = now() WHERE type = old_value;
  UPDATE public.common_properties SET type = new_value, updated_at = now() WHERE type = old_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
