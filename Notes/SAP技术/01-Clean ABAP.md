# Clean ABAP

## 一. 类单一职责 ( Single Responsibility)
**一句话：一个类只有一个变更理由，只负责一件业务/技术能力**

### 判定标准 (满足任意一条，就该拆分)
- 如果需求变更会同时修改：校验 + 落库 + 发消息 + 报表导出
- 类里面有一堆松散,不内聚的方法
- 构造函数依赖太多协作对象（依赖爆炸）
- 类名是通用大词：ZCL_INVOICE_PROCESSOR,ZCL_UTILTY，ZCL_HELPER
### 边界
- 不是"只能有一个方法",而是所有方法都服务同一个能力
- 方法同样遵循单一职责；长方法拆成小的编排方法，主方法只做调用编排
### 示例
```ABAP
❌ God Class
CLASS zcl_invoice_big DEFINITION.
  PUBLIC SECTION.
    METHODS validate_invoice.
    METHODS save_to_db.
    METHODS send_mail.
    METHODS generate_alv.
ENDCLASS.

✅ 拆分：职责隔离
" ZCL_INVOICE_VALIDATOR、ZCL_INVOICE_PERSISTER、ZCL_NOTIFIER、ZCL_ALV_REPORTER
```

## 二. 构造函数注入 (Constructor Injection)
Clean ABAP首选：**强制依赖必须通过构造函数传入，可选依赖才考虑Setter**
### 核心收益
- 对象一旦构造完成就处于合法状态，不会出现“实例化之后忘记set依赖”
- 依赖显示，Where-Used,单元测试Mock友好；
- 依赖抽象（Interface）而不是具体类，解耦
### 硬性规则
1.  **构造函数只做赋值，不执行业务逻辑**：不读数据库，不调用RFC,不发消息，不建立链接
2.  依赖全部声明为READ-ONLY实例属性（mo-xxx），外部不可篡改；
3.  如果依赖太多-->不是改成Setter，而是回到单一职责：拆类，或者引入Facade/Aggregate;
4.  禁止在构造函数内部NEW 具体实现（new zcl_xxx）；由调用方传入
```示例代码
" ✅ Good
CLASS zcl_invoice_service DEFINITION CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS constructor
      IMPORTING
        io_validator TYPE REF TO zif_invoice_validator
        io_persister TYPE REF TO zif_invoice_persister.
    METHODS process_invoice IMPORTING is_invoice TYPE zs_invoice.
  PRIVATE SECTION.
    DATA mo_validator TYPE REF TO zif_invoice_validator READ-ONLY.
    DATA mo_persister TYPE REF TO zif_invoice_persister READ-ONLY.
ENDCLASS.

CLASS zcl_invoice_service IMPLEMENTATION.
  METHOD constructor.
    mo_validator = io_validator.
    mo_persister = io_persister.
  ENDMETHOD.

  METHOD process_invoice.
    mo_validator->validate( is_invoice ).
    mo_persister->save( is_invoice ).
  ENDMETHOD.
ENDCLASS.
```

反模式
- 在构造函数里面执行业务
- 依赖在方法内部`New`
- 大量可选依赖塞在构造函数
- 使用静态类，全局变量作为隐式依赖

`|` 补充：静态工厂方法`create()`可以用来封装复杂实例化，但依然走构造注入

## 三. 异常类分层：**CX_STATIC_CHECK / CX_DYNAMIC_CHECK / CX_NO_CHECK**
### 继承树：
```Inheritance Tree
CX_ROOT
├─ CX_STATIC_CHECK
├─ CX_DYNAMIC_CHECK
└─ CX_NO_CHECK
```
| 基类 | 编译器检查 | 是否要在RASING声明 | 适用场景 |
| --- | --- | --- |--- |
| CX_STATIC_CHECK | ✅编译期 | ✅必须 | **业务可预期，强制调用方处理；** 业务校验失败，权限不足，前置条件不满足；调用者必须catch或者rasing抛出，否则编译报错 |
| CX_DYNAMIC_CHECK | ❌仅运行时 | 推荐声明（不声明编译能过，但炸了会Dump）| 运行时才会暴漏：数据库锁失败，RFC通信异常，除零，转换失败；可以通过前置检查规避，但不能完全杜绝；SAP很多系统异常属于这一类（CX_SY_*）
| CX_NO_CHECK | ❌ | ❌不能写在RAISING | 致命系统级：内存耗尽，严重运行时错误；几乎无法业务恢复，一般不主动抛出，不捕获 |

### Clean ABAP 分层实践
1. **业务根异常**：建 `ZCX_BUSINESS_ROOT` 继承 `CX_STATIC_CHECK`；所有业务校验异常从它继承；调用方必须显示处理
2. **技术运行异常**： `ZCX_TECH_ROOT` 继承 `CX_DYNAMIC_CHECK`；通信，持久化，外部服务失败
3. 不要直接raise `CX_ROOT`；不要混用sy-subrc+类异常；逐步消灭 `sy-subrc`，经典 `Exception`;
4. 异常携带上下文：单据号，行号，字段值；使用 `IF_MESSAGE`，带上长文本，日志信息
5. `TRY ... CATCH ... CLEANUP `；不要“吞异常”（空catch）；不能只抓CX_ROOT；分层捕获。
```方法签名示例
" 方法签名示例
METHODS validate_invoice
  IMPORTING is_invoice TYPE zs_invoice
  RAISING
    zcx_business_invalid_amount
    zcx_business_missing_customer
    zcx_tech_db_locked.
```
### `简单口诀`：
- ✅ **`CX_STATIC_CHECK`：你应该早就知道会出错，编译器逼着你处理**
- ✅ **`CX_DYNAMIC_CHECK`：运行时才翻车，你最好提前预防，并且声明**
- ✅ **`CX_NO_CHECK`：属于系统崩溃，不要主动抛出，不要到处抓**
  
## 四. 禁止全局数据（No Global Data）
`Clean ABAP`：**禁止在程序的全局声明区定义工作变量，内表，`TABLES`,表头行；禁止隐式全局状态**

### 被禁止的典型写法
```abap
REPORT zbad_report.
DATA: gv_bukrs TYPE bukrs,
      gt_invoice TYPE ztt_invoice.   " ❌ 全局数据

TABLES: bkpf.                        " ❌ 全局工作区
```

### 允许的状态
- 局部变量：方法内部 `DATA(...)`，内联声明；
- 类的实例属性（最好`READ-ONLY`,通过构造注入）；
- 类静态属性：仅限真正全局共享，并且严格封装（get/set,尽量避免）；
- 常量：接口/类里的常量`CONSTANTS`是允许的；

### 如果需要共享数据
- 封装到独立DAO/Repository;通过接口注入；
- 如果是缓存，放到专用静态类，不直接暴漏属性；
- 绝对不要靠全局变量跨方法，跨类传递上下文。

### 为什么严格禁止：
- 隐式依赖，单元测试无法隔离；
- 并发，重入，ALV,选择屏幕，多次调用时状态污染；
- 很难追踪修改点，Where-Used只能看到读，看不到时序；
- 是“面条式代码”源头

`例外：遗留传统LDB,老旧报表；新开发一律不允许`

`|` 附带：禁止带表头行的内表 `DATA gt_xxx TYPE ... WITH HEADER LINE`

## 五. Clean ABAP命名规范
核心原则：名字要表达意图；如果需要注释解释名字，说明名字不合格；使用`snake_case`;不推荐匈牙利前缀狂热，但项目一般保留轻量前缀用于快速识别类型。

### 推荐前缀（Clean ABAP社区通用，不是强制，但普遍落地）
| 前缀 | 含义 |
| --- | --- |
| iv_ | Importing参数 |
| ev_ | Exporting参数 |
| cv_ | Changing参数 |
| rv_ | Returning参数 |
| mo_ | Instance reference(object ref) |
| mv_ | Instance value(非引用) |
| so_ | Static ref |
| sv_ | Static value |
| lo_ | 局部引用变量 |
| lv_ | 局部值变量 |
| lt_ | 局部内表 |
| ls_ | 局部结构 |
| lr_ | 局部范围表 |
| gc_ | 全局/类静态常量 |
| if_ / zif_ | Interface |
| cl_ / zcl_ | Class |
| cx_ / zcx_ | Exception |

### 命名规则清单
1. **`snake_case`， 小写**；关键词大写（Pretty Printer）；
2. 使用业务术语，而不是技术术语；`is_invoice_approved`，不要 `flag1`；
3. 避免无意义缩写；缩写要团队统一；
4. 布尔名用 `is_ / has_ / should_`;
5. 内表用复数： `lt_invoices`；单行结构单数：`ls_invoice`;
6. 方法：动词开头 `validate_invoice`，`calculate_tax`；
7. 类：名词短语；接口：形容词/能力`zif_readable`,`zif_invoice_validator`;
8. 不要魔数；魔数提升为带业务名字的常量；
9. 不使用单字母变量（循环`i`除外）；
10. 名称最长30字符（ABAP对象限制）；客户命名带**`Z`**前缀。
    
```abap
" ✅
DATA(lv_invoice_total) = ls_invoice-netwr.
METHODS calculate_invoice_tax
  IMPORTING is_invoice TYPE zs_invoice
  RETURNING VALUE(rv_tax) TYPE wrbtr.

" ❌
DATA: v1 TYPE p, flag TYPE abap_bool.
METHODS calc.
```
