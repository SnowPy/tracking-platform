import { supabase } from '../supabase/client'

type PropertyTable = 'user_properties' | 'common_properties'

async function getProperties(table: PropertyTable) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

async function createProperty(table: PropertyTable, data: { name: string; display_name?: string; type: string; description?: string; example_value?: string; platforms?: string[]; notes?: string }) {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result
}

async function updateProperty(table: PropertyTable, id: string, data: { name?: string; display_name?: string; type?: string; description?: string; example_value?: string; platforms?: string[]; notes?: string; sort_order?: number }) {
  const { data: result, error } = await supabase
    .from(table)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result
}

async function deleteProperty(table: PropertyTable, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

// User Properties
export const getUserProperties = () => getProperties('user_properties')
export const createUserProperty = (data: Parameters<typeof createProperty>[1]) => createProperty('user_properties', data)
export const updateUserProperty = (id: string, data: Parameters<typeof updateProperty>[2]) => updateProperty('user_properties', id, data)
export const deleteUserProperty = (id: string) => deleteProperty('user_properties', id)

// Common Properties
export const getCommonProperties = () => getProperties('common_properties')
export const createCommonProperty = (data: Parameters<typeof createProperty>[1]) => createProperty('common_properties', data)
export const updateCommonProperty = (id: string, data: Parameters<typeof updateProperty>[2]) => updateProperty('common_properties', id, data)
export const deleteCommonProperty = (id: string) => deleteProperty('common_properties', id)
