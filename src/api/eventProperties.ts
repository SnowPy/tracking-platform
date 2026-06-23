import { supabase } from '../supabase/client'
import type { EventProperty } from '../types'

export async function getEventProperties(eventId: string): Promise<EventProperty[]> {
  const { data, error } = await supabase
    .from('event_properties')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createEventProperty(data: {
  project_id: string
  event_id: string
  name: string
  display_name?: string
  type: string
  description?: string
  required?: boolean
  example_value?: string
}) {
  const { data: result, error } = await supabase
    .from('event_properties')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function updateEventProperty(id: string, data: {
  name?: string
  display_name?: string
  type?: string
  description?: string
  required?: boolean
  example_value?: string
  sort_order?: number
}) {
  const { data: result, error } = await supabase
    .from('event_properties')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function deleteEventProperty(id: string) {
  const { error } = await supabase.from('event_properties').delete().eq('id', id)
  if (error) throw error
}
