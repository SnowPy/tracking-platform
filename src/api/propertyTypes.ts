import { supabase } from '../supabase/client'
import type { PropertyTypeConfig } from '../types'

export async function getPropertyTypes(projectId: string): Promise<PropertyTypeConfig[]> {
  const { data, error } = await supabase
    .from('property_types')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createPropertyType(data: { project_id: string; value: string; label: string; color?: string }) {
  const { data: result, error } = await supabase
    .from('property_types')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function updatePropertyType(id: string, data: { value?: string; label?: string; color?: string; sort_order?: number }) {
  // 获取旧值，用于级联更新
  const { data: oldData } = await supabase.from('property_types').select('value').eq('id', id).single()

  const { data: result, error } = await supabase
    .from('property_types')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // 如果 value 变了，级联更新所有使用该类型的属性
  if (data.value && oldData && oldData.value !== data.value) {
    const { error: rpcErr } = await supabase.rpc('update_property_type_value', {
      old_value: oldData.value,
      new_value: data.value,
    })
    if (rpcErr) throw rpcErr
  }

  return result
}

export async function deletePropertyType(id: string) {
  const { error } = await supabase.from('property_types').delete().eq('id', id)
  if (error) throw error
}
