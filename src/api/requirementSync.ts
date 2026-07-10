import { supabase } from '../supabase/client'
import { createEventProperty, deleteEventProperty, updateEventProperty } from './eventProperties'
import type { ProposedProperty, Requirement } from '../types'

export interface RequirementSyncResult {
  assetName: string
  action: 'created' | 'updated'
}

async function syncNewEvent(requirement: Requirement, projectId: string): Promise<RequirementSyncResult> {
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      project_id: projectId,
      name: requirement.event_name!,
      display_name: requirement.display_name || requirement.title,
      description: requirement.description,
      status: 'active',
      platforms: requirement.platforms || [],
      trigger_timing: requirement.trigger_timing || null,
    })
    .select()
    .single()
  if (error) throw error

  const properties = requirement.proposed_properties
    ?.filter((property) => !property.action || property.action === 'add')
    .map((property) => ({
      project_id: projectId,
      event_id: event.id,
      name: property.name,
      display_name: property.display_name || property.name,
      type: property.type,
      description: property.description,
      required: property.required,
    })) || []

  if (properties.length > 0) {
    const { error: propertyError } = await supabase.from('event_properties').insert(properties)
    if (propertyError) throw propertyError
  }

  return { assetName: event.name, action: 'created' }
}

async function applyEventPropertyChange(requirement: Requirement, property: ProposedProperty) {
  if (property.action === 'delete' && property.existing_id) {
    await deleteEventProperty(property.existing_id)
    return
  }

  if (property.action === 'modify' && property.existing_id) {
    await updateEventProperty(property.existing_id, {
      name: property.name,
      display_name: property.display_name,
      type: property.type,
      description: property.description,
      required: property.required,
    })
    return
  }

  if (property.action !== 'add' || !requirement.event_id) return
  await createEventProperty({
    project_id: requirement.project_id,
    event_id: requirement.event_id,
    name: property.name,
    display_name: property.display_name || property.name,
    type: property.type,
    description: property.description,
    required: property.required,
  })
}

async function syncExistingEvent(requirement: Requirement): Promise<RequirementSyncResult> {
  if (!requirement.event_id) throw new Error('需求未关联要修改的事件')

  const { error } = await supabase
    .from('events')
    .update({
      name: requirement.event_name,
      display_name: requirement.display_name || requirement.title,
      description: requirement.description,
      platforms: requirement.platforms || [],
      trigger_timing: requirement.trigger_timing || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirement.event_id)
  if (error) throw error

  for (const property of requirement.proposed_properties || []) {
    await applyEventPropertyChange(requirement, property)
  }

  return { assetName: requirement.event_name || requirement.title, action: 'updated' }
}

async function syncProperty(requirement: Requirement, projectId: string): Promise<RequirementSyncResult> {
  const tableName = requirement.tracking_type === 'common_property'
    ? 'common_properties'
    : 'user_properties'
  const propertyDefinition = requirement.proposed_properties?.[0]
  const propertyData = {
    name: requirement.event_name!,
    display_name: requirement.display_name || requirement.title,
    type: propertyDefinition?.type || 'string',
    description: requirement.description || propertyDefinition?.description || null,
    platforms: requirement.platforms || [],
    updated_at: new Date().toISOString(),
  }

  if (requirement.modification_type === 'new') {
    const { error } = await supabase.from(tableName).insert({ ...propertyData, project_id: projectId })
    if (error) throw error
    return { assetName: requirement.event_name || requirement.title, action: 'created' }
  }

  if (!requirement.event_id) throw new Error('需求未关联要修改的属性')
  const { error } = await supabase.from(tableName).update(propertyData).eq('id', requirement.event_id)
  if (error) throw error
  return { assetName: requirement.event_name || requirement.title, action: 'updated' }
}

export async function syncRequirementToTrackingAsset(requirement: Requirement, projectId: string) {
  if (!requirement.event_name) throw new Error('需求缺少技术名，无法同步')

  if (requirement.tracking_type !== 'event') {
    return syncProperty(requirement, projectId)
  }

  if (requirement.modification_type === 'new') {
    return syncNewEvent(requirement, projectId)
  }

  return syncExistingEvent(requirement)
}
