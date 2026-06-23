// 数据库类型定义

export interface Project {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Profile {
  id: string
  display_name: string | null
  role: 'admin' | 'member'
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  project_id: string
  name: string
  description: string | null
  parent_id: string | null
  sort_order: number
  created_at: string
}

export type EventStatus = 'draft' | 'active' | 'deprecated'

export interface TrackingEvent {
  id: string
  project_id: string
  name: string
  display_name: string
  category_id: string | null
  description: string | null
  status: EventStatus
  version: number
  changelog: string | null
  platforms: Platform[]
  trigger_timing: string | null
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  // 关联数据
  categories?: Pick<Category, 'id' | 'name'> | null
}

export type PropertyType = string  // 动态类型，由 property_types 表管理

export interface PropertyTypeConfig {
  id: string
  project_id: string
  value: string
  label: string
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

// 平台选项
export type Platform = 'android' | 'ios' | 'harmony' | 'server'

export const PLATFORM_OPTIONS: { value: Platform; label: string; color: string }[] = [
  { value: 'android', label: 'Android', color: '#3ddc84' },
  { value: 'ios', label: 'iOS', color: '#007aff' },
  { value: 'harmony', label: '鸿蒙', color: '#ff5800' },
  { value: 'server', label: '服务端', color: '#722ed1' },
]

export interface EventProperty {
  id: string
  project_id: string
  event_id: string
  name: string
  display_name: string | null
  type: PropertyType
  description: string | null
  required: boolean
  example_value: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface UserProperty {
  id: string
  project_id: string
  name: string
  display_name: string | null
  type: PropertyType
  description: string | null
  example_value: string | null
  platforms: Platform[]
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CommonProperty {
  id: string
  project_id: string
  name: string
  display_name: string | null
  type: PropertyType
  description: string | null
  example_value: string | null
  platforms: Platform[]
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type RequirementStatus = 'pending' | 'in_progress' | 'done' | 'rejected'
export type RequirementPriority = 'low' | 'medium' | 'high'
export type TrackingType = 'event' | 'common_property' | 'user_property'
export type RequirementType = 'new' | 'modify'

export const TRACKING_TYPE_OPTIONS: { value: TrackingType; label: string }[] = [
  { value: 'event', label: '事件' },
  { value: 'common_property', label: '公共属性' },
  { value: 'user_property', label: '用户属性' },
]

export interface Requirement {
  id: string
  project_id: string
  title: string
  display_name: string | null
  tracking_type: TrackingType
  description: string | null
  event_name: string | null
  event_id: string | null  // 关联已有事件
  modification_type: RequirementType  // 新增还是修改
  proposed_properties: ProposedProperty[]
  version: string | null               // 版本号
  platforms: Platform[]                // 目标平台
  trigger_timing: string | null        // 触发时机
  status: RequirementStatus
  priority: RequirementPriority
  requester_id: string | null
  assignee_id: string | null
  comment: string | null
  created_at: string
  updated_at: string
  // 关联数据
  profiles_requester?: Pick<Profile, 'id' | 'display_name'> | null
  profiles_assignee?: Pick<Profile, 'id' | 'display_name'> | null
  events?: Pick<TrackingEvent, 'id' | 'name' | 'display_name'> | null
}

export type PropertyAction = 'keep' | 'add' | 'modify' | 'delete'

export interface ProposedProperty {
  name: string
  display_name?: string
  type: PropertyType
  description: string
  required: boolean
  action?: PropertyAction      // 对已有属性的操作
  existing_id?: string          // 已有属性的 ID（修改/删除时使用）
}

// Dashboard 统计类型
export interface DashboardStats {
  totalEvents: number
  activeEvents: number
  deprecatedEvents: number
  pendingRequirements: number
}

// Database schema type for Supabase
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at'>
        Update: Partial<Omit<Project, 'id'>>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'>
        Update: Partial<Omit<Category, 'id'>>
      }
      events: {
        Row: TrackingEvent
        Insert: Omit<TrackingEvent, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TrackingEvent, 'id'>>
      }
      event_properties: {
        Row: EventProperty
        Insert: Omit<EventProperty, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<EventProperty, 'id'>>
      }
      user_properties: {
        Row: UserProperty
        Insert: Omit<UserProperty, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserProperty, 'id'>>
      }
      common_properties: {
        Row: CommonProperty
        Insert: Omit<CommonProperty, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CommonProperty, 'id'>>
      }
      requirements: {
        Row: Requirement
        Insert: Omit<Requirement, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Requirement, 'id'>>
      }
    }
  }
}
