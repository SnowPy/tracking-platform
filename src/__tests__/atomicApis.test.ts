import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Requirement } from '../types'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('../supabase/client', () => ({
  supabase: { rpc },
}))

import { syncRequirementToTrackingAsset } from '../api/requirementSync'
import { deletePropertyType, updatePropertyType } from '../api/propertyTypes'

const requirement = {
  id: 'requirement-1',
  project_id: 'project-1',
} as Requirement

describe('原子写入 API', () => {
  beforeEach(() => rpc.mockReset())

  it('需求验收只调用一次事务 RPC', async () => {
    rpc.mockResolvedValue({ data: [{ asset_name: 'product_click', sync_action: 'created' }], error: null })

    await expect(syncRequirementToTrackingAsset(requirement, 'project-1')).resolves.toEqual({
      assetName: 'product_click',
      action: 'created',
    })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('sync_requirement_to_tracking_asset', {
      p_requirement_id: 'requirement-1',
      p_expected_project_id: 'project-1',
    })
  })

  it('属性类型更新和删除都带项目边界', async () => {
    rpc.mockResolvedValue({ data: { id: 'type-1' }, error: null })

    await updatePropertyType('type-1', 'project-1', {
      value: 'integer',
      label: '整数',
      color: '#1677ff',
      sort_order: 1,
    })
    await deletePropertyType('type-1', 'project-1')

    expect(rpc).toHaveBeenNthCalledWith(1, 'update_property_type_config', {
      p_type_id: 'type-1',
      p_expected_project_id: 'project-1',
      p_value: 'integer',
      p_label: '整数',
      p_color: '#1677ff',
      p_sort_order: 1,
    })
    expect(rpc).toHaveBeenNthCalledWith(2, 'delete_property_type_config', {
      p_type_id: 'type-1',
      p_expected_project_id: 'project-1',
    })
  })
})
