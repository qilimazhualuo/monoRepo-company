# wc-theme 使用说明

主应用 / 子应用 / 业务组件共享的主题包。负责：

1. antdv-next `ConfigProvider` 多套风格预设
2. 运行时注入 `--app-*` CSS 变量（自定义样式跟着切）
3. Pinia 主题状态 + 无界 bus 跨应用同步

---

## 一、整体链路

```text
ThemeSwitcher / setTheme
        │
        ▼
  useThemeStore（localStorage: wc-ui-theme）
        │
        ├─► ThemeProvider → ConfigProvider（antd 组件换肤）
        │         └─► ThemeTokenRoot（写入 --app-* 到根节点）
        │
        └─► bus.$emit(THEME_CHANGE_EVENT)  ──► 子应用 setTheme
```

无界沙箱里主应用的 CSS 变量**进不去**子应用，所以子应用必须自己再包一层 `ThemeProvider`，靠 bus / props 同步 `themeKey`。

---

## 二、应用接入（main / sub-app）

### 1. 依赖

```json
{
  "dependencies": {
    "wc-theme": "0.0.1"
  }
}
```

### 2. Vite：自动注入 Less 变量

每个应用的 `vite.config.ts` 加一次即可，**业务组件不用再 `@import`**：

```ts
import { defineConfig } from 'vite'
// 或从包里拿常量：
// import { THEME_LESS_ADDITIONAL_DATA } from 'wc-theme'

export default defineConfig({
    css: {
        preprocessorOptions: {
            less: {
                additionalData: '@import "wc-theme/theme-vars.less";\n',
            },
        },
    },
})
```

### 3. 根组件包 ThemeProvider

**主应用**（`apps/main/src/App.vue`）：

```vue
<script setup lang="ts">
import { watch } from 'vue'
import { bus } from 'wujie'
import {
    ThemeProvider,
    ThemeSwitcher,
    useThemeStore,
    THEME_CHANGE_EVENT,
} from 'wc-theme'

const themeStore = useThemeStore()

watch(
    () => themeStore.currentTheme,
    (themeKey) => {
        bus.$emit(THEME_CHANGE_EVENT, themeKey)
    },
)
</script>

<template>
    <ThemeProvider>
        <!-- 布局 / 路由 -->
        <ThemeSwitcher />
    </ThemeProvider>
</template>
```

**子应用**（`apps/sub-app/src/App.vue`）：

```vue
<script setup lang="ts">
import { ThemeProvider } from 'wc-theme'
</script>

<template>
    <ThemeProvider>
        <router-view />
    </ThemeProvider>
</template>
```

子应用挂载时同步主题（`apps/sub-app/src/main.ts`）：

```ts
import { isThemeKey, THEME_CHANGE_EVENT, useThemeStore } from 'wc-theme'

// 初次：主应用 props
const initialTheme = window.$wujie?.props?.themeKey
if (typeof initialTheme === 'string' && isThemeKey(initialTheme)) {
    useThemeStore().setTheme(initialTheme)
}

// 后续：bus
window.$wujie?.bus?.$on(THEME_CHANGE_EVENT, (themeKey: unknown) => {
    if (typeof themeKey === 'string' && isThemeKey(themeKey)) {
        useThemeStore().setTheme(themeKey)
    }
})
```

主应用加载子应用时带上当前主题：

```vue
<WcWujie
    :props="{
        initialPath: subAppPath,
        themeKey: themeStore.currentTheme,
    }"
/>
```

---

## 三、业务组件怎么写样式（重点）

自定义 UI（不是 antd 组件）要跟着主题切，**禁止写死 `#1677ff` / `#fff`**，用主题变量。

### Less（推荐）

Vite 已自动注入变量后，直接写：

```vue
<style lang="less" scoped>
.card {
    color: @app-color-text;
    background: @app-color-bg-container;
    border: 1px solid @app-color-border;
    border-radius: @app-border-radius-lg;
    box-shadow: @app-box-shadow;

    &:hover {
        color: @app-color-primary;
        border-color: @app-color-primary-border;
    }
}
</style>
```

### 纯 CSS / 不走 Less

也可以直接用运行时 CSS 变量（由 `ThemeTokenRoot` 注入）：

```css
.card {
    color: var(--app-color-text);
    background: var(--app-color-bg-container);
}
```

### 可用变量一览

| Less 变量 | CSS 变量 | 含义 |
|-----------|----------|------|
| `@app-color-primary` | `--app-color-primary` | 主色 |
| `@app-color-primary-hover` | `--app-color-primary-hover` | 主色悬停 |
| `@app-color-primary-border` | `--app-color-primary-border` | 主色边框 |
| `@app-color-primary-bg` | `--app-color-primary-bg` | 主色浅底 |
| `@app-color-success` | `--app-color-success` | 成功色 |
| `@app-color-warning` | `--app-color-warning` | 警告色 |
| `@app-color-error` | `--app-color-error` | 错误色 |
| `@app-color-info` | `--app-color-info` | 信息色 |
| `@app-color-text` | `--app-color-text` | 主文字 |
| `@app-color-text-secondary` | `--app-color-text-secondary` | 次要文字 |
| `@app-color-text-tertiary` | `--app-color-text-tertiary` | 更淡文字 |
| `@app-color-text-quaternary` | `--app-color-text-quaternary` | 最淡文字 |
| `@app-color-text-light` | `--app-color-text-light` | 浅色文字（主色按钮上） |
| `@app-color-bg-base` | `--app-color-bg-base` | 基础底色 |
| `@app-color-bg-layout` | `--app-color-bg-layout` | 页面/布局底 |
| `@app-color-bg-container` | `--app-color-bg-container` | 卡片/内容容器底 |
| `@app-color-bg-elevated` | `--app-color-bg-elevated` | 浮层底 |
| `@app-color-bg-spotlight` | `--app-color-bg-spotlight` | 聚光底 |
| `@app-color-border` | `--app-color-border` | 边框 |
| `@app-color-border-secondary` | `--app-color-border-secondary` | 次边框 |
| `@app-color-split` | `--app-color-split` | 分割线 |
| `@app-color-fill` | `--app-color-fill` | 填充 |
| `@app-color-fill-secondary` | `--app-color-fill-secondary` | 次填充 |
| `@app-color-fill-tertiary` | `--app-color-fill-tertiary` | 更淡填充 |
| `@app-box-shadow` | `--app-box-shadow` | 阴影 |
| `@app-box-shadow-secondary` | `--app-box-shadow-secondary` | 次阴影 |
| `@app-border-radius` | `--app-border-radius` | 圆角 |
| `@app-border-radius-lg` | `--app-border-radius-lg` | 大圆角 |

antd 组件（`a-button`、`a-table` 等）走 `ConfigProvider`，一般不用自己套这些变量。

---

## 四、包内组件说明

| 导出 | 用途 |
|------|------|
| `ThemeProvider` | 根包装：ConfigProvider + Token 根节点，**每个应用根上必须有** |
| `ThemeTokenRoot` | 一般不用单独用，已含在 Provider 内 |
| `ThemeSwitcher` | 风格下拉，放在 header 等位置 |
| `useThemeStore()` | `currentTheme` / `setTheme` / `themeOptions` |
| `isDarkThemeKey(key)` | 是否暗色主题（如菜单 `theme="dark"`） |
| `THEME_CHANGE_EVENT` | 无界 bus 事件名：`wc-theme-change` |
| `THEME_STORAGE_KEY` | localStorage：`wc-ui-theme` |
| `THEME_LESS_ADDITIONAL_DATA` | vite additionalData 用的字符串常量 |

### 编程切换

```ts
import { useThemeStore } from 'wc-theme'

const themeStore = useThemeStore()
themeStore.setTheme('geek')
```

### 暗色菜单示例

```vue
<a-menu :theme="isDarkThemeKey(themeStore.currentTheme) ? 'dark' : 'light'" />
```

---

## 五、内置风格列表

| key | 名称 |
|-----|------|
| `default` | 默认风格 |
| `mui` | 类 MUI |
| `shadcn` | 类 shadcn |
| `bootstrap` | Bootstrap 拟物 |
| `cartoon` | 卡通风格 |
| `dark` | 暗黑风格 |
| `illustration` | 插画风格 |
| `glass` | 玻璃风格 |
| `geek` | 极客风格 |
| `lark` | 知识协作 |
| `blossom` | 桃花粉 |
| `serene` | 静谧 |

暗色：`dark`、`geek`（见 `DARK_THEME_KEYS`）。

---

## 六、packages 业务包（wc-basic / wc-page / wc-ui）

这些包里的自定义样式同样要用 `@app-*` / `var(--app-*)`，不要写死颜色。

前提：消费它们的 **应用** 已经：

1. 根上包了 `ThemeProvider`
2. vite 配了 `theme-vars.less` 的 `additionalData`

包本身一般**不必**再包一层 `ThemeProvider`（避免嵌套多套 ConfigProvider），除非该包被单独当独立应用跑。

---

## 七、常见坑

1. **只改 antd、自定义白底不变**  
   自定义区域还在用 `#fff`，改成 `@app-color-bg-container`。

2. **子应用不跟着切**  
   检查：子应用有没有 `ThemeProvider`；有没有监听 `THEME_CHANGE_EVENT`；主应用加载时有没有传 `themeKey`。

3. **Less 报 `@app-color-xxx` undefined**  
   检查应用 vite 有没有配 `additionalData`。不要指望在 `wc-theme/src/index.ts` 里 `import less` 能注入到各组件——Less 变量是编译期的。

4. **直接写 `var(--app-*)` 但没效果**  
   确认组件渲染在 `ThemeProvider` 内部（变量挂在 `.app-theme-root` 上）。
