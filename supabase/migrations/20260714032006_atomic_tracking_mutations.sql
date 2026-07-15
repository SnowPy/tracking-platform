-- 让动态属性类型真正生效，并将跨表写入收口为单个数据库事务。

ALTER TABLE public.event_properties DROP CONSTRAINT IF EXISTS event_properties_type_check;
ALTER TABLE public.user_properties DROP CONSTRAINT IF EXISTS user_properties_type_check;
ALTER TABLE public.common_properties DROP CONSTRAINT IF EXISTS common_properties_type_check;

-- 多项目数据的技术标识只需在项目内唯一。
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_name_key;
ALTER TABLE public.user_properties DROP CONSTRAINT IF EXISTS user_properties_name_key;
ALTER TABLE public.common_properties DROP CONSTRAINT IF EXISTS common_properties_name_key;
ALTER TABLE public.property_types DROP CONSTRAINT IF EXISTS property_types_value_key;
ALTER TABLE public.versions DROP CONSTRAINT IF EXISTS versions_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS events_project_name_key
  ON public.events(project_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS event_properties_event_name_key
  ON public.event_properties(event_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS user_properties_project_name_key
  ON public.user_properties(project_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS common_properties_project_name_key
  ON public.common_properties(project_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS property_types_project_value_key
  ON public.property_types(project_id, value);
CREATE UNIQUE INDEX IF NOT EXISTS versions_project_name_key
  ON public.versions(project_id, name);

DROP FUNCTION IF EXISTS public.update_property_type_value(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.sync_requirement_to_tracking_asset(
  p_requirement_id UUID,
  p_expected_project_id UUID
) RETURNS TABLE(asset_name TEXT, sync_action TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_requirement public.requirements%ROWTYPE;
  v_event_id UUID;
  v_existing_id UUID;
  v_property JSONB;
  v_action TEXT;
  v_asset_name TEXT;
  v_sync_action TEXT;
  v_affected INTEGER;
BEGIN
  SELECT * INTO v_requirement
  FROM public.requirements
  WHERE id = p_requirement_id
    AND project_id = p_expected_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '需求不存在或不属于当前项目';
  END IF;
  IF NULLIF(BTRIM(v_requirement.event_name), '') IS NULL THEN
    RAISE EXCEPTION '需求缺少技术名，无法同步';
  END IF;

  v_asset_name := v_requirement.event_name;
  v_sync_action := CASE WHEN v_requirement.modification_type = 'new' THEN 'created' ELSE 'updated' END;

  IF v_requirement.tracking_type = 'event' THEN
    IF v_requirement.modification_type = 'new' THEN
      INSERT INTO public.events (
        project_id, name, display_name, description, status, platforms, trigger_timing
      ) VALUES (
        p_expected_project_id,
        v_requirement.event_name,
        COALESCE(NULLIF(v_requirement.display_name, ''), v_requirement.title),
        v_requirement.description,
        'active',
        COALESCE(v_requirement.platforms, '{}'),
        v_requirement.trigger_timing
      )
      RETURNING id INTO v_event_id;
    ELSE
      IF v_requirement.event_id IS NULL THEN
        RAISE EXCEPTION '需求未关联要修改的事件';
      END IF;
      v_event_id := v_requirement.event_id;

      UPDATE public.events
      SET name = v_requirement.event_name,
          display_name = COALESCE(NULLIF(v_requirement.display_name, ''), v_requirement.title),
          description = v_requirement.description,
          platforms = COALESCE(v_requirement.platforms, '{}'),
          trigger_timing = v_requirement.trigger_timing,
          updated_at = now()
      WHERE id = v_event_id
        AND project_id = p_expected_project_id;
      GET DIAGNOSTICS v_affected = ROW_COUNT;
      IF v_affected <> 1 THEN
        RAISE EXCEPTION '要修改的事件不存在或不属于当前项目';
      END IF;
    END IF;

    FOR v_property IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_requirement.proposed_properties, '[]'::jsonb))
    LOOP
      v_action := COALESCE(v_property->>'action', CASE WHEN v_requirement.modification_type = 'new' THEN 'add' ELSE 'keep' END);

      IF v_action = 'add' THEN
        INSERT INTO public.event_properties (
          project_id, event_id, name, display_name, type, description, required
        ) VALUES (
          p_expected_project_id,
          v_event_id,
          v_property->>'name',
          COALESCE(NULLIF(v_property->>'display_name', ''), v_property->>'name'),
          COALESCE(NULLIF(v_property->>'type', ''), 'string'),
          v_property->>'description',
          COALESCE((v_property->>'required')::BOOLEAN, false)
        );
      ELSIF v_action IN ('modify', 'delete') THEN
        IF NULLIF(v_property->>'existing_id', '') IS NULL THEN
          RAISE EXCEPTION '属性变更缺少已有属性 ID';
        END IF;
        v_existing_id := (v_property->>'existing_id')::UUID;

        IF v_action = 'delete' THEN
          DELETE FROM public.event_properties
          WHERE id = v_existing_id
            AND event_id = v_event_id
            AND project_id = p_expected_project_id;
        ELSE
          UPDATE public.event_properties
          SET name = v_property->>'name',
              display_name = COALESCE(NULLIF(v_property->>'display_name', ''), v_property->>'name'),
              type = COALESCE(NULLIF(v_property->>'type', ''), 'string'),
              description = v_property->>'description',
              required = COALESCE((v_property->>'required')::BOOLEAN, false),
              updated_at = now()
          WHERE id = v_existing_id
            AND event_id = v_event_id
            AND project_id = p_expected_project_id;
        END IF;

        GET DIAGNOSTICS v_affected = ROW_COUNT;
        IF v_affected <> 1 THEN
          RAISE EXCEPTION '要变更的事件属性不存在或不属于当前项目';
        END IF;
      END IF;
    END LOOP;
  ELSE
    v_property := COALESCE(v_requirement.proposed_properties->0, '{}'::jsonb);

    IF v_requirement.tracking_type = 'common_property' THEN
      IF v_requirement.modification_type = 'new' THEN
        INSERT INTO public.common_properties (
          project_id, name, display_name, type, description, platforms
        ) VALUES (
          p_expected_project_id,
          v_requirement.event_name,
          COALESCE(NULLIF(v_requirement.display_name, ''), v_requirement.title),
          COALESCE(NULLIF(v_property->>'type', ''), 'string'),
          COALESCE(v_requirement.description, v_property->>'description'),
          COALESCE(v_requirement.platforms, '{}')
        );
      ELSE
        IF v_requirement.event_id IS NULL THEN
          RAISE EXCEPTION '需求未关联要修改的公共属性';
        END IF;
        UPDATE public.common_properties
        SET name = v_requirement.event_name,
            display_name = COALESCE(NULLIF(v_requirement.display_name, ''), v_requirement.title),
            type = COALESCE(NULLIF(v_property->>'type', ''), 'string'),
            description = COALESCE(v_requirement.description, v_property->>'description'),
            platforms = COALESCE(v_requirement.platforms, '{}'),
            updated_at = now()
        WHERE id = v_requirement.event_id
          AND project_id = p_expected_project_id;
        GET DIAGNOSTICS v_affected = ROW_COUNT;
        IF v_affected <> 1 THEN
          RAISE EXCEPTION '要修改的公共属性不存在或不属于当前项目';
        END IF;
      END IF;
    ELSIF v_requirement.tracking_type = 'user_property' THEN
      IF v_requirement.modification_type = 'new' THEN
        INSERT INTO public.user_properties (
          project_id, name, display_name, type, description, platforms
        ) VALUES (
          p_expected_project_id,
          v_requirement.event_name,
          COALESCE(NULLIF(v_requirement.display_name, ''), v_requirement.title),
          COALESCE(NULLIF(v_property->>'type', ''), 'string'),
          COALESCE(v_requirement.description, v_property->>'description'),
          COALESCE(v_requirement.platforms, '{}')
        );
      ELSE
        IF v_requirement.event_id IS NULL THEN
          RAISE EXCEPTION '需求未关联要修改的用户属性';
        END IF;
        UPDATE public.user_properties
        SET name = v_requirement.event_name,
            display_name = COALESCE(NULLIF(v_requirement.display_name, ''), v_requirement.title),
            type = COALESCE(NULLIF(v_property->>'type', ''), 'string'),
            description = COALESCE(v_requirement.description, v_property->>'description'),
            platforms = COALESCE(v_requirement.platforms, '{}'),
            updated_at = now()
        WHERE id = v_requirement.event_id
          AND project_id = p_expected_project_id;
        GET DIAGNOSTICS v_affected = ROW_COUNT;
        IF v_affected <> 1 THEN
          RAISE EXCEPTION '要修改的用户属性不存在或不属于当前项目';
        END IF;
      END IF;
    ELSE
      RAISE EXCEPTION '不支持的埋点类型: %', v_requirement.tracking_type;
    END IF;
  END IF;

  UPDATE public.requirements
  SET status = 'done', updated_at = now()
  WHERE id = p_requirement_id
    AND project_id = p_expected_project_id;

  RETURN QUERY SELECT v_asset_name, v_sync_action;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_property_type_config(
  p_type_id UUID,
  p_expected_project_id UUID,
  p_value TEXT,
  p_label TEXT,
  p_color TEXT,
  p_sort_order INTEGER
) RETURNS public.property_types
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_old public.property_types%ROWTYPE;
  v_result public.property_types%ROWTYPE;
BEGIN
  SELECT * INTO v_old
  FROM public.property_types
  WHERE id = p_type_id
    AND project_id = p_expected_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '属性类型不存在或不属于当前项目';
  END IF;

  IF v_old.value <> p_value THEN
    UPDATE public.event_properties SET type = p_value, updated_at = now()
      WHERE project_id = p_expected_project_id AND type = v_old.value;
    UPDATE public.user_properties SET type = p_value, updated_at = now()
      WHERE project_id = p_expected_project_id AND type = v_old.value;
    UPDATE public.common_properties SET type = p_value, updated_at = now()
      WHERE project_id = p_expected_project_id AND type = v_old.value;
  END IF;

  UPDATE public.property_types
  SET value = p_value,
      label = p_label,
      color = p_color,
      sort_order = p_sort_order,
      updated_at = now()
  WHERE id = p_type_id
    AND project_id = p_expected_project_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_property_type_config(
  p_type_id UUID,
  p_expected_project_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_type public.property_types%ROWTYPE;
  v_usage_count BIGINT;
BEGIN
  SELECT * INTO v_type
  FROM public.property_types
  WHERE id = p_type_id
    AND project_id = p_expected_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '属性类型不存在或不属于当前项目';
  END IF;

  SELECT
    (SELECT count(*) FROM public.event_properties WHERE project_id = p_expected_project_id AND type = v_type.value)
    + (SELECT count(*) FROM public.user_properties WHERE project_id = p_expected_project_id AND type = v_type.value)
    + (SELECT count(*) FROM public.common_properties WHERE project_id = p_expected_project_id AND type = v_type.value)
  INTO v_usage_count;

  IF v_usage_count > 0 THEN
    RAISE EXCEPTION '属性类型仍被 % 个属性使用，无法删除', v_usage_count;
  END IF;

  DELETE FROM public.property_types
  WHERE id = p_type_id
    AND project_id = p_expected_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_requirement_to_tracking_asset(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_property_type_config(UUID, UUID, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_property_type_config(UUID, UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sync_requirement_to_tracking_asset(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_property_type_config(UUID, UUID, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_property_type_config(UUID, UUID) TO authenticated;
