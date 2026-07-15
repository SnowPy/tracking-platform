import { supabase } from '../supabase/client'
import type { Requirement } from '../types'

export interface RequirementSyncResult {
  assetName: string
  action: 'created' | 'updated'
}

interface RequirementSyncRow {
  asset_name: string
  sync_action: 'created' | 'updated'
}

export async function syncRequirementToTrackingAsset(requirement: Requirement, projectId: string) {
  const { data, error } = await supabase.rpc('sync_requirement_to_tracking_asset', {
    p_requirement_id: requirement.id,
    p_expected_project_id: projectId,
  })
  if (error) throw error

  const row = (Array.isArray(data) ? data[0] : data) as RequirementSyncRow | null
  if (!row) throw new Error('同步完成后未返回资产信息')

  return {
    assetName: row.asset_name,
    action: row.sync_action,
  } satisfies RequirementSyncResult
}
