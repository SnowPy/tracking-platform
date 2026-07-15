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

export async function createPropertyType(data: { project_id: string; value: string; label: string; color?: string; sort_order?: number }) {
  const { data: result, error } = await supabase
    .from('property_types')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result
}

interface PropertyTypeMutation {
  value: string
  label: string
  color: string
  sort_order: number
}

export async function updatePropertyType(id: string, projectId: string, data: PropertyTypeMutation) {
  const { data: result, error } = await supabase.rpc('update_property_type_config', {
    p_type_id: id,
    p_expected_project_id: projectId,
    p_value: data.value,
    p_label: data.label,
    p_color: data.color,
    p_sort_order: data.sort_order,
  })
  if (error) throw error
  return result as PropertyTypeConfig
}

export async function deletePropertyType(id: string, projectId: string) {
  const { error } = await supabase.rpc('delete_property_type_config', {
    p_type_id: id,
    p_expected_project_id: projectId,
  })
  if (error) throw error
}
