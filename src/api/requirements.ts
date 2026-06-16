import { supabase } from '../supabase/client'
import type { Requirement, ProposedProperty } from '../types'

export async function getRequirements(): Promise<Requirement[]> {
  // 分别查询需求和用户信息，在前端做关联
  const { data, error } = await supabase
    .from('requirements')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error

  // 收集所有用户 ID，批量查询 profiles
  const userIds = [...new Set(data.flatMap((r: any) => [r.requester_id, r.assignee_id].filter(Boolean)))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds)
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

  return data.map((r: any) => ({
    ...r,
    profiles_requester: r.requester_id ? profileMap.get(r.requester_id) || null : null,
    profiles_assignee: r.assignee_id ? profileMap.get(r.assignee_id) || null : null,
  })) as unknown as Requirement[]
}

export async function createRequirement(data: {
  title: string
  display_name?: string
  tracking_type?: string
  description?: string
  event_name?: string
  event_id?: string | null
  modification_type?: string
  proposed_properties?: ProposedProperty[]
  priority?: string
  version?: string | null
  platforms?: string[]
  trigger_timing?: string | null
}) {
  const { data: result, error } = await supabase
    .from('requirements')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function updateRequirement(id: string, data: {
  title?: string
  display_name?: string
  tracking_type?: string
  description?: string
  event_name?: string
  event_id?: string | null
  modification_type?: string
  proposed_properties?: ProposedProperty[]
  status?: string
  priority?: string
  assignee_id?: string | null
  comment?: string
  version?: string | null
  platforms?: string[]
  trigger_timing?: string | null
}) {
  const { data: result, error } = await supabase
    .from('requirements')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function deleteRequirement(id: string) {
  const { error } = await supabase.from('requirements').delete().eq('id', id)
  if (error) throw error
}
