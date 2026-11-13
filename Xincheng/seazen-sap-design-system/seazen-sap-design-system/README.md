# 绿洲 SAP UI 设计规范交付

版本：0.9.1-review；日期：2026/11/03。

- 单文件浏览：dist/standalone.html（核心规范和控件无需外部资源，常用下载嵌入文件）。
- 分文件站点：dist/index.html + assets + downloads，可整体交给前端部署。
- 产品经理：docs/design-guidelines.md、ai-task-template.md、checklist.md。
- 前端/AI：docs/tokens.json、business-rules.json，以及 dist/assets 内独立 CSS/JS。
- Skill：skill/seazen-sap-ui，可放入 Codex 的 skills 目录；不要求其他 AI 工具安装 Skill。

## 本地预览

可直接双击 dist/index.html 或 dist/standalone.html。也可在本目录运行：

```bash
python3 -m http.server 4188 --directory dist
```

访问 http://127.0.0.1:4188/ 。

## 更新

编辑 dist/assets/catalog.js（规则内容）、tokens.css（Token）与示例后，运行 node scripts/build-deliverables.mjs，同步 MD/JSON/Skill。打包前运行 node scripts/verify.mjs，再运行 python3 scripts/package.py。

## 边界

这是评审稿。精确数值引用已有文档记录；未声称重新测量或完成全部生产接口验证。最小字号 12px 已确认，另保留 13 项待确认事项。所有站点示例为虚构数据，表格/保存/导出只在本地演示。HTML 示例不是 SAPUI5 的替代运行时。
