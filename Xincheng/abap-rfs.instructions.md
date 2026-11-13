---
applyTo: "**/*.abap,**/*.cds,**/*.bdef,**/*.srvd,**/*.ddls"
description: "ABAP Remote File System (adt://) 工具调用节流规范 — 减少对 S4D 系统的冗余读取"
---

# ABAP RFS 工具调用节流规范

访问 `adt://` 虚拟文件系统的每一次工具调用都会把返回内容计入上下文。ABAP 对象源码
（尤其是老旧的大类/大报表）动辄几百到几千行，无节制调用是本 workspace 里
**最大的单点 token 消耗来源**。修改/查阅任何 ABAP 对象前，按以下优先级操作。

## 1. 先 info 后 lines

调用任何 FM / Method / Class 前，**先用 `get_abap_object_info` 拿签名、参数、方法列表等元数据**，
判断是否真的需要看实现源码。很多场景（比如只是确认某个参数类型、某个方法是否存在）
`get_abap_object_info` 就够了，不需要 `get_abap_object_lines` 把整个对象吐出来。

## 2. 先 search 后 lines

需要定位某段逻辑在哪个方法/哪一行时，**先用 `search_abap_object_lines`** 缩小范围，
再针对定位到的位置读取，禁止在不确定目标位置的情况下直接对大对象整体 `get_abap_object_lines`。

## 3. 同一 session 内不重复读取

- 一个对象在当前会话中已经完整读取过、且没有被本会话修改或重新激活，**不要因为"保险起见"再读一次**。
- 如果需要确认某个对象是否已被修改，优先用 `get_version_history`（若已在工具列表中）或
  询问用户，而不是重新拉取全文比对。

## 4. 局部编辑优先于整份重写

- 修改代码使用 `replace_string_in_file` / `insert_edit_into_file` 做定点替换。
- 禁止"读全文 → 本地整理 → 整份内容写回"的模式，这会让输出侧的 token 消耗翻倍。

## 5. 批量激活，不要逐行激活

- 一批相关对象改完后统一激活一次，不要改一个字段就激活一次。
- 每次激活附带的状态回读也是开销，减少激活次数本身就是节流。

## 6. 大对象分段读取

- 如果 `get_abap_object_lines` 支持行号范围参数，优先只读取需要的区间（比如某个方法的起止行），
  而不是整个 Include/Class 全文。
- 对于篇幅很大的报表/Include，先用 `get_abap_object_info` 或大纲信息确认方法/表单边界，
  再按需分段读取。

## 7. 调用前的自检清单

在发起任何 `get_abap_object_lines` 调用前，先问自己：
- [ ] 我是否已经知道要找什么？（如果不知道，先 search，不要整份读）
- [ ] 我是否已经在本次会话中读过这个对象？（如果读过且未变更，复用已有信息）
- [ ] 元数据（`get_abap_object_info`）是否已经够用？（够用就不必读全文）
