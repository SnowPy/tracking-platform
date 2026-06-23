import { supabase } from '../supabase/client'

export interface Version {
  id: string
  project_id: string
  name: string
  created_at: string
}

export async function getVersions(projectId: string): Promise<Version[]> {
  const { data, error } = await supabase
    .from('versions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createVersion(projectId: string, name: string) {
  const { data, error } = await supabase
    .from('versions')
    .insert({ project_id: projectId, name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVersion(id: string) {
  const { error } = await supabase.from('versions').delete().eq('id', id)
  if (error) throw error
}

export async function updateVersion(id: string, name: string) {
  const { data, error } = await supabase
    .from('versions')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
