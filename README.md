# 2026 世界杯 · 赛程 / 榜单 / 集锦 / 直播

美加墨联合举办的 2026 FIFA 世界杯信息站。静态前端 + API 代理，支持赛程、积分榜、精彩集锦与直播入口，数据来自 [worldcup26.ir](https://worldcup26.ir)。

## 功能

- **首页**：赛事概览、重点比赛
- **赛程**：默认展示当天比赛，按开球时间排列（北京时间）
- **榜单**：12 个小组积分榜、射手榜
- **集锦**：基于赛程自动生成的视频集锦列表
- **直播**：当前/下一场比赛、转播链接与文字播报

页面打开时自动同步最新数据；同一会话内再次访问会先用本地缓存快速展示，再在后台更新。

## 技术栈

- 纯静态站点：`HTML` + `CSS` + 原生 `JavaScript`
- 本地开发：`Python 3` 内置 HTTP 服务（`server.py`）
- 线上部署：`Netlify` + Edge Functions（`/api/*` 代理）

## 项目结构

```
.
├── index.html              # 入口页面
├── css/style.css           # 样式
├── js/
│   ├── app.js              # 页面逻辑与渲染
│   ├── live-data.js        # 数据同步与合并
│   ├── data.js             # 本地基础数据（赛程骨架、球队等）
│   ├── timezone.js         # 球场当地时间 → 北京时间
│   ├── team-map.js         # 球队中英文名映射
│   ├── video-map.js        # 视频与转播链接
│   └── highlights-gen.js   # 集锦生成
├── netlify/
│   └── edge-functions/
│       └── api.js          # Netlify API 代理（含 /api/sync）
├── netlify.toml            # Netlify 部署配置
├── server.py               # 本地开发服务器
└── edge-functions/         # EdgeOne 等平台用的 Edge 函数（可选）
```

## 本地开发

需要 **Python 3**。

```bash
cd YXWorldCup2026
python3 server.py
```

浏览器访问：<http://127.0.0.1:8765>

本地服务会：

1. 托管静态文件（HTML / CSS / JS）
2. 通过 `/api/sync` 并行代理 upstream 接口，解决浏览器 CORS 限制

> 首次同步可能需 6–10 秒，取决于上游 API 响应速度；20 秒内重复请求会命中服务端缓存。

## 部署到 Netlify（GitHub 直连）

本项目通过 **GitHub 仓库 → Netlify 自动部署**，无需构建命令。根目录的 `netlify.toml` 会在每次 push 后自动生效。

### 首次关联

1. 将本项目推送到 GitHub 仓库
2. 打开 [Netlify](https://app.netlify.com/) → **Add new site** → **Import an existing project**
3. 选择 **GitHub**，授权后选中对应仓库
4. 确认部署设置（一般无需修改）：

   | 项 | 值 |
   |----|-----|
   | Branch to deploy | `main`（或你的默认分支） |
   | Build command | `python3 scripts/fetch-snapshot.py`（已在 `netlify.toml` 中配置） |
   | Publish directory | `.` |

   > 构建阶段会拉取最新 API 数据并写入 `js/sync-snapshot.js`，访客首次打开即可秒开，再在后台更新为实时数据。

5. 点击 **Deploy site**，等待首次构建完成

部署成功后 Netlify 会分配 `*.netlify.app` 域名，打开即可访问。

### 日常更新

代码推送到 GitHub 后，Netlify 会自动触发重新部署：

```bash
git add .
git commit -m "update"
git push origin main
```

在 Netlify 控制台 **Deploys** 页可查看每次部署状态与日志。

### 检查是否部署成功

1. 打开站点首页，赛程/比分能正常显示
2. 浏览器访问 `https://你的域名.netlify.app/api/sync`，应返回 JSON（含 `games`、`groups`、`teams` 字段）

若 `/api/sync` 返回 404，请确认仓库内包含：

- `netlify.toml`
- `netlify/edge-functions/api.js`

并已在 Netlify **Site configuration → Build & deploy → Continuous deployment** 中启用 GitHub 自动部署。

### 其他部署方式

<details>
<summary>Netlify CLI / 手动上传（可选）</summary>

**CLI：**

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

**拖拽：** Netlify → Add new site → Deploy manually，拖入项目文件夹。

</details>

## 部署配置说明

`netlify.toml` 核心内容：

| 配置 | 说明 |
|------|------|
| `publish = "."` | 直接发布仓库根目录 |
| `[[edge_functions]]` | 将 `/api/*` 交给 Edge Function 处理 |
| `Cache-Control` | 页面不缓存；CSS/JS 缓存 1 天 |

### API 路由

| 路径 | 作用 |
|------|------|
| `/api/sync` | 聚合拉取 games / groups / teams（前端主要使用） |
| `/api/get/games` 等 | 单接口代理（兼容保留） |

Edge Function 实现见 `netlify/edge-functions/api.js`， upstream 源站为 `https://worldcup26.ir`。

## 自定义域名

Netlify 控制台 → **Site configuration** → **Domain management** → **Add a domain**，按提示配置 DNS 即可。

## 常见问题

### 页面加载较慢

首次打开会先展示**构建快照 / 本地缓存 / 静态数据**（几乎秒开），同时在后台请求 `/api/sync` 更新为最新比分。

上游 `worldcup26.ir` 本身响应偏慢（6–10 秒），已通过以下方式缓解：

- 页面 `<head>` 内提前发起 `/api/sync` 请求
- Netlify 构建时生成 `js/sync-snapshot.js` 数据快照
- 单次 `/api/sync` 合并请求 + Edge 60 秒缓存
- 浏览器 `sessionStorage` 30 分钟内复用

### 本地与线上差异

| 环境 | API 实现 |
|------|----------|
| 本地 | `server.py` |
| Netlify | `netlify/edge-functions/api.js` |

前端统一请求 `/api/sync`，无需改代码。

### EdgeOne Pages

若部署到 EdgeOne Pages，可使用 `edge-functions/api/[[default]].js` 与 `edgeone.json`，配置方式与 Netlify 不同，请参考 EdgeOne 文档。

## 数据来源与声明

- 赛程、比分、积分榜等实时数据来自第三方 API，仅供学习与交流
- 视频集锦链接指向 YouTube / FIFA / FOX Sports 等官方或公开渠道
- 本项目与 FIFA 官方无关联

## License

MIT
