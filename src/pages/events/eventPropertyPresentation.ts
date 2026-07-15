import type { PropertyCreateValues, PropertyItem } from '../../components/PropertyTable'
import type { EventProperty } from '../../types'

export function toEventPropertyItem(property: EventProperty): PropertyItem {
  return {
    id: property.id,
    name: property.name,
    display_name: property.display_name,
    type: property.type,
    description: property.description,
    required: property.required,
    example_value: property.example_value,
    sort_order: property.sort_order,
  }
}

type EventPropertyMutation = Pick<PropertyCreateValues, 'name' | 'type'>
  & Partial<Pick<PropertyCreateValues, 'display_name' | 'description' | 'required' | 'example_value'>>

type PartialEventPropertyMutation = Partial<EventPropertyMutation>

export function toEventPropertyMutation(values: PropertyCreateValues): EventPropertyMutation
export function toEventPropertyMutation(values: Partial<PropertyCreateValues>): PartialEventPropertyMutation
export function toEventPropertyMutation(values: Partial<PropertyCreateValues>): PartialEventPropertyMutation {
  return {
    name: values.name,
    display_name: values.display_name,
    type: values.type,
    description: values.description,
    required: values.required,
    example_value: values.example_value,
  }
}
