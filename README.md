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
    message = "新春快乐，万事胜意！"
```

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

## 依赖致谢

- [solarlunar](https://github.com/yize/solarlunar) v3.1.0（ISC）
- [canvas-confetti](https://github.com/catdad/canvas-confetti) v1.9.4（ISC）

## License

MIT
