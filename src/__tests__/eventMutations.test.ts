import { describe, expect, it } from 'vitest'
import { buildEventSearchFilter } from '../api/eventSearch'
import { toEventPropertyItem, toEventPropertyMutation } from '../pages/events/eventPropertyPresentation'
import type { EventProperty } from '../types'

describe('事件搜索过滤器', () => {
  it('用引号保护 PostgREST 保留字符', () => {
    expect(buildEventSearchFilter('a,b')).toBe('name.ilike."%a,b%",display_name.ilike."%a,b%"')
    expect(buildEventSearchFilter(' a"b\\c ')).toBe('name.ilike."%a\\"b\\\\c%",display_name.ilike."%a\\"b\\\\c%"')
  })
})

describe('事件属性表单映射', () => {
  it('保留显示名，并只提交 event_properties 存在的字段', () => {
    const property = {
      id: 'property-1',
      project_id: 'project-1',
      event_id: 'event-1',
      name: 'product_id',
      display_name: '商品 ID',
      type: 'string',
      description: '商品标识',
      required: true,
      example_value: '123',
      sort_order: 0,
      created_at: '2026-07-14T00:00:00.000Z',
      updated_at: '2026-07-14T00:00:00.000Z',
    } satisfies EventProperty

    expect(toEventPropertyItem(property).display_name).toBe('商品 ID')
    expect(toEventPropertyMutation({
      name: property.name,
      display_name: property.display_name,
      type: property.type,
      description: property.description,
      required: property.required,
      example_value: property.example_value,
      platforms: ['android'],
      notes: '不属于事件属性表',
    })).toEqual({
      name: 'product_id',
      display_name: '商品 ID',
      type: 'string',
      description: '商品标识',
      required: true,
      example_value: '123',
    })
  })
})
