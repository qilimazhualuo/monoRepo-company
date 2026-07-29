# TIF 加载子应用

Vue 前端（无界挂载）+ Bun/Elysia 后端。二三维用 workspace 包 `map`。

## 目录

```
apps/tif-load/
  front/    # tif-load-front  :3003  base /tif-load-front/
  backed/   # server-tif-load :9003  /api/*
```

## 启动

在 monorepo 根目录：

```bash
yarn install
yarn dev:tif-load
```

或分别：

```bash
yarn workspace server-tif-load run dev
yarn workspace tif-load-front run dev
```

嵌在 main：菜单进 `/tif-load-front`（需 main 已代理）；独立：http://localhost:3003/tif-load-front/

## API

- `GET /api/health`
- `POST /api/files/upload`
- `GET /api/files`
- `GET /api/files/:id/heightmap`
- `GET /api/files/:id/heightmap.bin`
