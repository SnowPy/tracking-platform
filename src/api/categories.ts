import { supabase } from '../supabase/client'
import type { Category } from '../types'

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function getCategoryTree() {
  const categories = await getCategories()
  const map = new Map<string, Category & { children: Category[] }>()
  const roots: (Category & { children: Category[] })[] = []

  categories.forEach((c) => map.set(c.id, { ...c, children: [] }))

  categories.forEach((c) => {
    const node = map.get(c.id)!
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

export async function createCategory(data: { name: string; description?: string; parent_id?: string | null }) {
  const { data: result, error } = await supabase
    .from('categories')
    .insert({ ...data, sort_order: 0 })
    .select()
    .single()
  if (error) throw error
  return result
}

export async function updateCategory(id: string, data: { name?: string; description?: string; parent_id?: string | null }) {
  const { data: result, error } = await supabase
    .from('categories')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}
