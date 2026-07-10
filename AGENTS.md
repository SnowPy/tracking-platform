# 仓库协作指南

## 重要协作规则

- 在修改任何代码、配置、迁移、脚本或文档文件之前，必须先向用户说明准备修改的方案和目的，并得到用户明确确认后才能开始修改。
- 不要擅自做主。若需求存在多种实现方式、影响范围不确定，或可能改变既有行为，必须先询问用户。
- 可以在未确认前进行只读操作，例如查看文件、搜索代码、运行 `git status`、阅读日志或分析问题。
- 用户已经明确要求的单次文件修改视为已获得该修改的授权；除此之外，不要扩展修改范围。

## 项目结构与模块组织

源代码位于 `src/`。各领域模块有清晰归属：

- `src/api/`：数据访问层。每个领域一个模块，例如 `events.ts`、`categories.ts`、`requirements.ts`。模块导出异步函数，用于查询 Supabase 并返回带类型的结果。API 模块不得导入 React 或组件代码。
- `src/components/`：可复用 UI 组件，例如 `AuthGuard.tsx`、`MainLayout.tsx`、`PropertyTable.tsx`，供多个页面共享。
- `src/pages/`：路由级页面组件，按领域组织到子目录，例如 `events/`、`properties/`、`requirements/`、`categories/`、`docs/`。每个子目录包含主页面以及相关弹窗或子组件。
- `src/stores/`：Zustand 状态仓库，例如 `authStore.ts`、`appStore.ts`。全局状态放在这里，组件局部状态保留在组件内部。
- `src/types/`：TypeScript 类型定义，以及映射 Supabase 表结构的 `Database` schema 类型。
- `src/supabase/`：Supabase 客户端初始化，例如 `client.ts`。只有该模块创建客户端，其他模块都从这里导入。
- `supabase/migrations/`：数据库迁移，按顺序编号，例如 `001_init.sql`、`002_enhancements.sql`。
- `public/`：原样提供的静态资源。
- `dist/`：构建产物，已加入 `.gitignore`。
- 配置文件位于项目根目录，例如 `vite.config.ts`、`tsconfig*.json`、`eslint.config.js`。

## 构建、测试与开发命令

- `npm run dev`：启动带 HMR 的 Vite 开发服务器。
- `npm run build`：先运行 `tsc -b` 做类型检查，再运行 `vite build` 生成生产构建。
- `npm run lint`：对所有 `.ts` / `.tsx` 文件运行 ESLint。
- `npm run preview`：在本地预览生产构建。

当前尚未配置测试运行器。添加测试时，请将测试放在与被测模块同目录的 `__tests__/` 目录中，并使用与项目依赖一致的测试框架。

## 编码风格与命名约定

- **语言**：TypeScript，启用 strict mode。所有源文件使用 `.ts` 或 `.tsx`。
- **格式化与 lint**：使用 ESLint v10，包含 `typescript-eslint`、`eslint-plugin-react-hooks` 和 `eslint-plugin-react-refresh`。提交前运行 `npm run lint`。
- **命名**：
  - 组件及其文件使用 PascalCase，例如 `EventListPage.tsx`、`AuthGuard.tsx`。
  - 工具模块和 API 文件使用 camelCase，例如 `events.ts`、`authStore.ts`。
  - 变量、函数和 hooks 使用 camelCase。
  - TypeScript 接口和类型使用 PascalCase，例如 `TrackingEvent`、`DashboardStats`。
  - 数据库枚举值使用 snake_case，例如 `draft`、`in_progress`、`active`。
- **导入**：使用相对路径导入。除非明确引入，不使用路径别名或 barrel re-export。
- **UI**：使用 Ant Design 组件和 `ConfigProvider` 主题。必须显式导入 `antd` locale，例如 `zhCN`。避免临时 CSS，优先使用 Ant Design token 和组件 props。

## 测试指南

项目目前尚未安装测试框架。在添加测试框架之前：

- 将无副作用逻辑，例如类型守卫、格式化 helper、校验逻辑，保持为纯函数，方便后续测试。
- 避免 API 模块与组件逻辑紧耦合，确保 API 层可以脱离 React 单独测试。

## 提交与 Pull Request 指南

项目目前没有强制提交规范。请遵循以下实践：

- Commit message 使用英文祈使句，例如使用 "Add event filtering by status"，不要使用 "Added event filtering"。
- 每个提交聚焦于一个逻辑变更。
- Pull Request 需要包含变更内容和原因，关联相关 issue；如果涉及 UI 变更，请附截图。
- 合并前 squash 掉琐碎的 fixup 提交。

## 安全与配置提示

- **不要提交 `.env`**：该文件已在 `.gitignore` 中。复制 `.env.example` 为 `.env`，并填入 Supabase 凭据。
- Supabase 客户端使用 **anon key** 配合 Row-Level Security（RLS）。所有访问控制都应通过 Supabase RLS 策略执行，而不是依赖客户端逻辑。
- 环境变量通过 `import.meta.env.VITE_*` 访问。只有以 `VITE_` 开头的变量会进入客户端 bundle。

## 架构概览

应用遵循 **展示层 - 数据访问层** 分离：

1. **页面**（`src/pages/`）定义路由，并组合 Ant Design 组件和共享组件。
2. **状态仓库**（`src/stores/`）使用 Zustand 保存全局状态，例如认证和会话。
3. **API 模块**（`src/api/`）封装 Supabase 查询和 mutation。页面与状态仓库调用这些函数，不直接调用 `supabase`。
4. **类型**（`src/types/index.ts`）定义共享 schema，包括将 Supabase 表映射为 Row/Insert/Update 形状的 `Database` 类型。
5. **认证** 通过 `AuthGuard.tsx` 流转，由它检查 Zustand auth store 后再渲染受保护路由。

添加新功能时：

- 先在 `src/types/index.ts` 中定义类型。
- 在 `src/api/` 中添加 API 函数。
- 在 `src/pages/<domain>/` 中创建页面组件。
- 在 `src/App.tsx` 中接入路由。
- 如果功能需要全局状态，在 `src/stores/` 中添加 store。
