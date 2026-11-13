# Clean ABAP 评审清单
> 覆盖：单一职责、构造注入、异常分层、禁止全局数据、命名规范

## 一、类：单一职责
- [ ] 类只存在一个变更理由；不混合校验、持久化、通知、导出、报表逻辑
- [ ] 类名是明确业务名词，不是 Helper / Utility / Processor / Tool 这类大词
- [ ] 如果依赖数量过多（>5 个协作接口），评估拆类，而不是增加 Setter
- [ ] 所有方法都服务该类的核心职责；无关功能移到其它类
- [ ] 不存在“上帝类”，方法数量、代码行数没有失控

## 二、依赖与构造注入
- [ ] 强制依赖通过 `CONSTRUCTOR IMPORTING` 传入，优先传入接口（ZIF_*）
- [ ] 可选依赖优先不使用；确有必要才使用 Setter，并标注文档
- [ ] 构造函数仅做成员赋值，不执行 SELECT / RFC / COMMIT / 消息 / 业务计算
- [ ] 依赖引用存储为 `READ-ONLY` 的实例属性，外部不可篡改
- [ ] 方法内部不直接 `NEW zcl_xxx`；实例创建交给调用方 / static factory `create`
- [ ] 如果使用工厂方法，工厂只是封装构造，不绕过注入规则

## 三、异常分层 CX_STATIC_CHECK / CX_DYNAMIC_CHECK
- [ ] 业务校验异常：继承 ZCX_BUSINESS_ROOT → `CX_STATIC_CHECK`
- [ ] 技术运行异常（锁、RFC、转换、数据库临时故障）：继承 ZCX_TECH_ROOT → `CX_DYNAMIC_CHECK`
- [ ] 不主动抛出、不批量捕获 `CX_NO_CHECK`
- [ ] 不直接 raise / catch `CX_ROOT`
- [ ] 方法签名显式在 `RAISING` 列出所有静态检查异常
- [ ] 每个异常携带上下文：单据号、行号、字段、原值；使用 IF_MESSAGE
- [ ] 没有空的 `CATCH`；异常要么处理，要么向上抛出；必要时使用 `CLEANUP`
- [ ] 逐步淘汰 `SY-SUBRC`、老式 `EXCEPTIONS`

## 四、全局数据
- [ ] REPORT / PROGRAM / FUNCTION GROUP 全局区：无 DATA、内表、工作区
- [ ] 禁止 `TABLES:`
- [ ] 禁止 `... WITH HEADER LINE`
- [ ] 如果需要共享状态：封装到 Repository / DAO / Cache 类，通过接口注入
- [ ] 静态属性慎用；如果存在静态状态，必须有并发、重入说明
- [ ] 常量允许，推荐放在接口或者类的 `CONSTANTS`

## 五、命名规范
- [ ] snake_case，变量小写；ABAP 关键字大写
- [ ] 参数前缀：`iv_ / ev_ / cv_ / rv_`
- [ ] 实例：`mo_`（引用）、`mv_`（值）
- [ ] 局部：`lo_ / lv_ / lt_ / ls_ / lr_ / lc_`
- [ ] 静态：`so_ / sv_ / gc_`
- [ ] 布尔：`is_ / has_ / should_`，使用 `xsdbool`
- [ ] 内表复数，结构单数
- [ ] 方法动词开头；类名词；接口表达能力
- [ ] 名字表达意图；不使用 `v1, flag, temp`
- [ ] 魔数提取为命名常量
- [ ] 长度遵守 ABAP 对象 30 字符限制；客户对象带 Z 前缀

## 六、附加软约束
- [ ] 方法短小，只做一件事
- [ ] 使用内联声明 `DATA(...)`
- [ ] 优先 `RETURNING VALUE()`，少用 `EXPORTING / CHANGING`
- [ ] 单元测试可以替换依赖（注入接口天然支持 Mock）
- [ ] 如果是遗留改造，单独标记，不直接套用全部规则
