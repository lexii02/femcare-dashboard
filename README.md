# FemCare Dashboard

女性护理行业趋势监测 Dashboard。

## 数据更新

Vite / 线上运行时读取路径：

```text
/data/FemCare_SIGNAL_LOG.md
```

对应项目文件：

```text
public/data/FemCare_SIGNAL_LOG.md
```

如果你仍在 `src/data/FemCare_SIGNAL_LOG.md` 维护源文件，需要同步复制到 `public/data/FemCare_SIGNAL_LOG.md`，因为 Vite 运行时不能直接通过 URL fetch `src/data` 内的文件。页面会在加载时读取并解析 Markdown，不再在 `app.js` 中硬编码周报 Signal 内容。

## 本地预览

直接打开：

```text
index.html
```

如果浏览器阻止 `file:///` 读取本地 Markdown，请运行：

```bat
start-dashboard.cmd
```

然后访问：

```text
http://127.0.0.1:4173
```

## 结构

```text
public/data/
  FemCare_SIGNAL_LOG.md
src/data/
  FemCare_SIGNAL_LOG.md
src/config/
  tagConfig.ts
  tagConfig.js
app.js
index.html
styles.css
server.js
start-dashboard.cmd
```

`src/config/tagConfig.ts` 是标签管理源文件；`tagConfig.js` 是浏览器运行时加载文件。
