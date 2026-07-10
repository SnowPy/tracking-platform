import { supabase } from '../supabase/client'
import type { TrackingEvent } from '../types'

const PAGE_SIZE = 20
const FULL_LIST_PAGE_SIZE = 1000

interface EventListParams {
  projectId: string
  category_id?: string
  status?: string
  search?: string
  page: number
}

interface EventListResult {
  data: TrackingEvent[]
  count: number
}

export async function getEvents(params: EventListParams): Promise<EventListResult> {
  let query = supabase
    .from('events')
    .select('*, categories(id, name)', { count: 'exact' })
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })
    .range((params.page - 1) * PAGE_SIZE, params.page * PAGE_SIZE - 1)

  if (params.category_id) {
    query = query.eq('category_id', params.category_id)
  }
  if (params.status) {
    query = query.eq('status', params.status)
  }
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,display_name.ilike.%${params.search}%`)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data as TrackingEvent[], count: count ?? 0 }
}

export async function getAllEvents(projectId: string): Promise<TrackingEvent[]> {
  const events: TrackingEvent[] = []
  let start = 0

  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('*, categories(id, name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(start, start + FULL_LIST_PAGE_SIZE - 1)

    if (error) throw error
    const page = data as TrackingEvent[]
    events.push(...page)
    if (page.length < FULL_LIST_PAGE_SIZE) return events
    start += FULL_LIST_PAGE_SIZE
  }
}

export async function getEventById(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*, categories(id, name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as TrackingEvent
}

export async function createEvent(data: {
  project_id: string
  name: string
  display_name: string
  category_id?: string | null
  description?: string
  status?: string
  platforms?: string[]
  trigger_timing?: string
  notes?: string
}) {
  const { data: result, error } = await supabase
    .from('events')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function updateEvent(id: string, data: {
  name?: string
  display_name?: string
  category_id?: string | null
  description?: string
  status?: string
  platforms?: string[]
  trigger_timing?: string
  notes?: string
}) {
  const { data: result, error } = await supabase
    .from('events')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}

export async function getEventStats(projectId: string) {
  const { count: total } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('project_id', projectId)
  const { count: active } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'active')
  const { count: deprecated } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'deprecated')

  return {
    total: total ?? 0,
    active: active ?? 0,
    deprecated: deprecated ?? 0,
  }
}
