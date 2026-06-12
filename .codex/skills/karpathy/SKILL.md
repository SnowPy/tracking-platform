---
name: karpathy
description: 借鉴 Andrej Karpathy 的代码风格——简洁、从零实现、极少抽象、代码即教学。适用于 tracking_platform 项目的 TypeScript/React 代码编写，以及任何时候需要编写可读性强、教学性强的清晰代码。
---

# Karpathy 编码风格指南

## 核心理念

Karpathy 风格的代码追求**极致的清晰和教学性**。每一段代码都应该像是写给同事看的教程。

### 1. 代码即教学

代码的首要读者是人，其次才是编译器。每一段代码都应该让人读一遍就懂。

```typescript
// 好的风格：直接、线性、自解释
export async function getEventStats() {
  const { count: total } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })

  const { count: active } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  return { total: total ?? 0, active: active ?? 0 }
}
```

### 2. 扁平优于嵌套

- 不要超过两层嵌套回调或条件。
- 优先使用 early return 消除 else 分支。
- 避免深层继承链：React 组件用组合而非继承。

```typescript
// 避免
if (condition) {
  if (subCondition) {
    // 深层逻辑
  }
}

// 推荐
if (!condition) return
if (!subCondition) return
// 主逻辑放在最外层
```

### 3. 显式优于隐式

- 不用魔术数字，用命名常量。
- 不用隐式类型转换，用显式判断。
- 副作用要标明：异步函数用 `async` 标记，纯函数不加副作用。

```typescript
const PAGE_SIZE = 20  // 命名常量，而非直接写数字

function getRange(page: number) {
  const start = (page - 1) * PAGE_SIZE
  const end = page * PAGE_SIZE - 1
  return { start, end }
}
```

### 4. 合理从零实现

- 如果逻辑少于 20 行，不要引入第三方库。
- 小工具函数直接手写，不增加依赖。
- 但数据库查询、UI 框架等基础设施层面的依赖（Supabase、Ant Design、React Router）正常使用。
- **判断标准**：一行 import 解决一整类问题 → 用库；为了一个工具函数引入整个包 → 手写。

### 5. 单文件聚焦

- 一个文件只做一件事，做好。
- 如果逻辑能装进 100-200 行，优先放在一个文件里。
- 只有当文件超过 300 行或职责明显分离时再拆分。

### 6. 注释写 why，不写 what

```typescript
// 不好的注释：描述代码在做什么
// 从数据库获取 events 列表
const data = await supabase.from('events').select('*')

// 好的注释：解释为什么这样做
// 使用 head: true 只取 count，避免传输大量数据
const { count } = await supabase
  .from('events')
  .select('*', { count: 'exact', head: true })
```

### 7. 线性流程优先

- 函数体尽量从上到下线性执行。
- 避免回调地狱、 Promise 链式地狱——用 async/await。
- 避免在循环中嵌套复杂逻辑——提取为命名函数。

### 8. 命名精准

- 变量名要精确反映含义，不缩写（除了 `id`、`url` 等标准缩写）。
- 布尔值用 `is`/`has`/`should` 前缀。
- 函数名用动词开头（`get`、`create`、`update`、`delete`）。
- 类型名用名词（`TrackingEvent`、`DashboardStats`）。

## 本项目的具体应用

### TypeScript / React

```typescript
// 遵循本项目的 api/ + stores/ 分层
// API 层：纯数据访问，职责单一
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}
```

### Zustand Stores

```typescript
// Store 保持扁平和聚焦
interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}
```

### 组件

```typescript
// 组件保持函数式、小、聚焦
// 一个组件做的事不应超过屏幕三分之一
function StatusBadge({ status }: { status: EventStatus }) {
  return <Tag color={STATUS_COLORS[status]}>{status}</Tag>
}
```

## 检查清单

写代码之前快速自检：

- [ ] 这段代码我一年后还能看懂吗？
- [ ] 有没有可以去掉的抽象层？
- [ ] 能否用 early return 减少嵌套？
- [ ] 变量名是否准确表达了含义？
- [ ] 有没有引入不必要的依赖？
- [ ] 注释是在解释 why 还是 what？