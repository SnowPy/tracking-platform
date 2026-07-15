function escapePostgrestValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function buildEventSearchFilter(search: string) {
  const pattern = `"%${escapePostgrestValue(search.trim())}%"`
  return `name.ilike.${pattern},display_name.ilike.${pattern}`
}
