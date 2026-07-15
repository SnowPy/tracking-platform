import { supabase } from '../supabase/client'
import type { Profile, Requirement, ProposedProperty } from '../types'

type ProfileSummary = Pick<Profile, 'id' | 'display_name'>

export async function getRequirements(projectId: string): Promise<Requirement[]> {
  // 分别查询需求和用户信息，在前端做关联
  const { data, error } = await supabase
    .from('requirements')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error

  // 收集所有用户 ID，批量查询 profiles
  const requirements = data as Requirement[]
  const userIds = [...new Set(requirements.flatMap((requirement) => (
    [requirement.requester_id, requirement.assignee_id].filter((id): id is string => Boolean(id))
  )))]
  let profiles: ProfileSummary[] = []
  if (userIds.length > 0) {
    const profileResult = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)
    if (profileResult.error) throw profileResult.error
    profiles = profileResult.data as ProfileSummary[]
  }
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  return requirements.map((requirement) => ({
    ...requirement,
    profiles_requester: requirement.requester_id ? profileMap.get(requirement.requester_id) || null : null,
    profiles_assignee: requirement.assignee_id ? profileMap.get(requirement.assignee_id) || null : null,
  }))
}

export async function createRequirement(data: {
  project_id: string
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
