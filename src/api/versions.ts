import { supabase } from '../supabase/client'

export interface Version {
  id: string
  name: string
  created_at: string
}

export async function getVersions(): Promise<Version[]> {
  const { data, error } = await supabase
    .from('versions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createVersion(name: string) {
  const { data, error } = await supabase
    .from('versions')
    .insert({ name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVersion(id: string) {
  const { error } = await supabase.from('versions').delete().eq('id', id)
  if (error) throw error
}
