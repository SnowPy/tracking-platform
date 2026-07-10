import { describe, expect, it } from 'vitest'
import type { Requirement } from '../types'
import {
  filterRequirements,
  getRequirementDisplayName,
  getRequirementPlatformText,
  sortRequirements,
} from '../pages/requirements/requirementPresentation'

function createRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: 'requirement-1',
    project_id: 'project-1',
    title: '新增-事件-商品点击',
    display_name: '商品点击',
    tracking_type: 'event',
    description: '用户点击商品卡片',
    event_name: 'product_click',
    event_id: null,
    modification_type: 'new',
    proposed_properties: [],
    version: '1.0.0',
    platforms: ['android', 'ios'],
    trigger_timing: '点击时',
    status: 'pending',
    priority: 'medium',
    requester_id: null,
    assignee_id: null,
    comment: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('requirement presentation', () => {
  it('uses the display name instead of the generated title', () => {
    expect(getRequirementDisplayName(createRequirement())).toBe('商品点击')
    expect(getRequirementDisplayName(createRequirement({ display_name: null }))).toBe('新增-事件-商品点击')
  })

  it('summarizes all selected platforms', () => {
    expect(getRequirementPlatformText(['android', 'ios', 'harmony', 'server'])).toBe('全部平台')
    expect(getRequirementPlatformText(['android', 'ios'])).toBe('Android / iOS')
  })

  it('filters by query and excludes unsupported statuses', () => {
    const requirements = [
      createRequirement(),
      createRequirement({ id: 'requirement-2', display_name: '会员类型', event_name: 'member_type' }),
      createRequirement({ id: 'requirement-3', status: 'rejected', display_name: '商品点击' }),
    ]

    const result = filterRequirements(requirements, { query: 'product_click' })
    expect(result.map((requirement) => requirement.id)).toEqual(['requirement-1'])
  })

  it('sorts by priority and then latest update time', () => {
    const requirements = [
      createRequirement({ id: 'medium', priority: 'medium' }),
      createRequirement({ id: 'high-old', priority: 'high', updated_at: '2026-07-01T00:00:00.000Z' }),
      createRequirement({ id: 'high-new', priority: 'high', updated_at: '2026-07-02T00:00:00.000Z' }),
    ]

    expect(sortRequirements(requirements).map((requirement) => requirement.id)).toEqual([
      'high-new',
      'high-old',
      'medium',
    ])
  })
})
