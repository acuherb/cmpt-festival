# cmpt-festival

为 [FixIt](https://github.com/hugo-fixit/FixIt) 主题打造的节日换肤组件：根据**公历 / 农历 / 节气**自动切换站点主题风格，命中节日时展示祝福横幅与彩带、飘雪等特效。

灵感与规范来自 [cmpt-santa-hat](https://github.com/hugo-fixit/cmpt-santa-hat)。

## 特性

- 农历节日零维护：内置 [solarlunar](https://github.com/yize/solarlunar)（1900-2100 年数据，已 vendor，无运行时 CDN 依赖），春节、元宵、端午、七夕、中秋、重阳、腊八、除夕（自动识别腊月廿九/三十）逐年自动匹配
- 节气节日：清明、冬至按节气日自动匹配
- 皮肤三级分级：`level 1` 仅换色 → `level 2` 加祝福横幅 → `level 3` 加彩带/飘雪特效
- 春节 / 元宵渲染**纯 CSS 大红灯笼**（顶部两侧悬挂、竖排文字、摇摆 + 流苏，移植自站点的 profile 灯笼，尊重 `prefers-reduced-motion`，检测旧版 `.lantern` 自动去重）
- 春节 / 除夕 / 元旦 / 国庆进站放一轮**背景烟花**（约 4 秒 6 发，canvas 绘制后自动回收）
- 页首主题装饰：春节/除夕/元宵/国庆/元旦**拉花彩旗**、圣诞/冬至**冰凌挂檐**、中秋**月夜**（圆月 + 星空闪烁 + 流云）
- **三层景深飘雪**：远景细点 / 中景柔光 / 近景六臂雪花晶体（自转），全局风场缓慢转向，亮暗模式自动换雪色
- **倒计时预告**：临近声明了 `pre` 的节日（春节 7 天 / 圣诞 5 天 / 中秋·冬至 3 天），日常外观下弹出「距离春节还有 3 天」预告横幅，命中当天才上全皮肤
- **站点适配层**：命中节日时自动接管定制化页首（渐变 `background-image`），并对奶油色水滴 SVG 装饰与 [cmpt-flyfish](https://github.com/hugo-fixit/cmpt-flyfish) 鱼群按节日色相染色（`--festival-tint` 滤镜）
- 自动适配亮/暗色模式（`light-dark()`）
- 哀悼日自动停用（默认 `*-9-18`、`*-12-13`、`*-5-12`，优先级高于一切节日）
- 尊重 `prefers-reduced-motion`，移动端自动隐藏头部装饰
- 站点可叠加：命中后根元素带 `data-festival="chunjie"` 等属性，方便二次定制

## 接入（Hugo Module）

```toml
[module]
  [[module.imports]]
    path = "github.com/hugo-fixit/FixIt"
  [[module.imports]]
    path = "github.com/acuherb/cmpt-festival"
```

在站点 `params.toml` 的挂载点中注入：

```toml
[custom_partials]
  assets = [
    "inject/festival.fixit.html",
  ]
```

本地开发可在 `hugo.work` 中 `use` 本目录，配合 `HUGO_MODULE_WORKSPACE=hugo.work` 实时调试。

## 配置（可选）

站点 `params.toml` 中 `[festival]` 段会**浅合并**覆盖默认配置：

```toml
[festival]
  effects = true      # 特效总开关
  banner = true       # 祝福横幅
  mutedDates = ["*-9-18", "*-12-13", "*-5-12"]   # 哀悼日

  # 自定义节日表（提供后完全替换默认表）
  [[festival.festivals]]
    id = "chunjie"
    type = "lunar"        # solar（公历 M-D）/ lunar（农历 M-D）/ term（节气名）
    date = "1-1"
    name = "春节"
    level = 3             # 1 仅换肤 / 2 加横幅 / 3 加特效
    icon = "🏮"
    message = "新春快乐，万事胜意！"   # 纯文本（按 textContent 渲染，不支持 HTML/Markdown）
    duration = 1          # 生效天数（含当天），跨年的 duration 已正确处理
    pre = 7               # 提前 N 天显示「距离xx还有 N 天」预告横幅（不换肤）
    effects = ["lantern", "bunting", "confetti", "firework"]   # 见下
```

### `effects`：把特效绑到节日上（推荐）

节日条目写 `effects` 数组后，该节日的特效**完全由它决定**，不再依赖 `id`：

```toml
[[festival.festivals]]
  id = "xmas"            # 自定义 id 也能用全部特效
  type = "solar"
  date = "12-24"
  name = "平安夜"
  level = 3
  effects = ["snow", "icicle"]
```

可取值：`lantern`（灯笼）、`bunting`（拉花）、`icicle`（冰凌）、`moon`（月夜）、`confetti`（彩带）、`firework`（烟花）、`snow`（飘雪）。

未写 `effects` 时，回退到旧的按 id 匹配的默认表（`lanternFestivals` 等 6 个数组，仍可用）。注意 `confetti` / `firework` / `snow` 属于 canvas 特效，需 `level = 3` 且未开启 reduced-motion；同时挂多个会各跑一个 RAF（都能自动回收，但不必叠加太多）。

### 其它可选字段

- `previewDate`（`'YYYY-MM-DD'`）：日期覆盖，仅用于预览/测试，正式环境不要配置
- 同时命中多个节日时按 `level` 降序取第一个，同级取节日表中靠前者
- `mutedDates` 优先级最高，命中哀悼日时一切效果停用

## 内置节日表

| 节日 | 类型 | 级别 | 皮肤 |
|---|---|---|---|
| 元旦 1-1 | solar | 3 | 红橙点缀 + 彩带烟花 |
| 春节 正月初一 | lunar | 3 | 红金 + 灯笼 + 彩带烟花 |
| 元宵 正月十五 | lunar | 2 | 暖红粉 + 灯笼 |
| 清明（节气） | term | 1 | 低饱和素色 |
| 劳动节 5-1 | solar | 2 | 红橙点缀 |
| 端午 五月初五 | lunar | 2 | 青绿 |
| 七夕 七月初七 | lunar | 2 | 粉紫 |
| 中秋 八月十五 | lunar | 2 | 深蓝金 + 圆月 |
| 国庆 10-1（3 天） | solar | 3 | 红橙点缀 + 烟花 |
| 重阳 九月初九 | lunar | 1 | 秋色淡染 |
| 腊八 腊月初八 | lunar | 1 | 秋色淡染 |
| 冬至（节气） | term | 3 | 冷蓝 + 飘雪 |
| 除夕（腊月最后一天） | lunar | 3 | 红金 + 灯笼 + 彩带烟花 |
| 圣诞 12-25 | solar | 3 | 冷蓝 + 飘雪 |

## 特效层级（z-index）

| 层 | z-index | 交互 |
|---|---|---|
| 祝福横幅 | 9999 | 可点击关闭 |
| 飘雪 | 9998 | 穿透 |
| 灯笼 | 9997 | 穿透 |
| 烟花 | 9996 | 穿透 |
| 月夜装饰 | 9994 | 穿透 |
| 拉花 / 冰凌 | 9990 / 页首内相对定位 | 穿透 |

站点若自定义了 9xxx 层级组件，可自行覆盖 `.festival-*` 或把 `[class^='fest']` 统一降到安全区。

## 站点适配层说明

`html[data-festival] #header-desktop`（页首渐变接管）、`#header-desktop::after`（水滴类装饰染色）、`#flyfish canvas`（[cmpt-flyfish](https://github.com/hugo-fixit/cmpt-flyfish) 鱼群染色）这三条规则**只在你同时使用对应定制时生效**：

- 站点没有这些节点 → 无任何影响
- 站点有自己的定制页首 → 命中节日时会被节日渐变覆盖，如不希望被接管，在站点样式里对这三条选择器用更高特异性覆盖即可
- 冰凌挂檐挂在 `#header-desktop`，移动端回退到 `#header-mobile`；灯笼在 ≤1000px 自动缩小并贴边

## 本地预览

仓库内的 `preview/` 已被 `.gitignore` 排除，用于上线前逐节日核对观感：

```bash
./preview/serve.sh        # 编译 + 起服务 + 打开预览台
```

预览台可切换 2026/2027 全部节日、亮暗模式、重放特效、模拟哀悼日（URL 参数 `?f=<id>-<年>&pre=N` 可演示倒计时预告），并内嵌了本站定制页首/水滴/flyfish 的模拟元素。

### 快照测试（防农历回归）

日期匹配逻辑抽成了无依赖纯函数（`assets/js/festival-core.js`），用预览页的 2026/2027 真实节日日期表做快照断言，另覆盖多天窗口、跨年窗口、越界年份、哀悼日、倒计时等边界。vendor 升级或改匹配逻辑后跑一次即可防静默回归：

```bash
node preview/tests/snapshot.test.mjs
```

## 依赖致谢

- [solarlunar](https://github.com/yize/solarlunar) v3.1.0（ISC）
- [canvas-confetti](https://github.com/catdad/canvas-confetti) v1.9.4（ISC）

## License

MIT
