/**
 * Festival Skin Component for FixIt
 * 根据公历/农历/节气自动切换站点节日主题皮肤。
 *
 * 内置依赖（已 vendor，无需运行时 CDN）：
 * - solarlunar v3.1.0 (ISC)  公农历互转与节气
 * - canvas-confetti v1.9.4 (ISC)  彩带特效
 *
 * @author acuherb
 * @license MIT
 */
import solarlunarPkg from './vendor/solarlunar.min.js';
import './vendor/confetti.browser.min.js';
import {
  addDays,
  toLunar,
  isMuted,
  pickFestival,
  daysBefore,
  DEFAULT_FESTIVALS,
} from './festival-core.js';

/* solarlunar 的 UMD 导出形态在不同打包器 interop 下可能是 API 本体或 { default: API } */
const solarlunar = solarlunarPkg.solar2lunar ? solarlunarPkg : solarlunarPkg.default;

/* ============================== 默认配置 ============================== */

const DEFAULT_CONFIG = {
  /** 特效总开关（彩带/飘雪） */
  effects: true,
  /** 是否显示祝福横幅 */
  banner: true,
  /**
   * 哀悼日（'*' 匹配任意年份），命中时禁用一切节日效果
   */
  mutedDates: ['*-9-18', '*-12-13', '*-5-12'],
  /**
   * 节日表。type: solar（公历 M-D）/ lunar（农历 M-D）/ term（节气名）
   * level: 1 仅换肤；2 换肤+横幅；3 换肤+横幅+特效
   * duration: 生效天数（含当天），默认 1
   * pre: 提前 N 天显示倒计时预告横幅（如春节 7）
   */
  festivals: DEFAULT_FESTIVALS,
  /** 飘雪特效节日 */
  snowFestivals: ['shengdan', 'dongzhi'],
  /** 彩带特效节日（需 level >= 3） */
  confettiFestivals: ['chunjie', 'chuxi', 'newyear'],
  /** 背景烟花节日（需 level >= 3） */
  fireworkFestivals: ['chunjie', 'chuxi', 'newyear', 'guoqing'],
  /** 渲染纯 CSS 灯笼的节日 */
  lanternFestivals: ['chunjie', 'yuanxiao'],
  /** 页首拉花彩旗 */
  buntingFestivals: ['chunjie', 'chuxi', 'yuanxiao', 'guoqing', 'newyear'],
  /** 页首冰凌挂檐 */
  icicleFestivals: ['shengdan', 'dongzhi'],
  /** 月夜装饰（圆月 + 星空 + 流云） */
  moonFestivals: ['zhongqiu'],
};

const SNOW_DURATION = 20000;
const BANNER_DURATION = 8000;

/* ============================== 工具函数 ============================== */

/** 当前是否为暗色方案（优先 color-scheme，读取不到时回退 prefers-color-scheme） */
const isDarkScheme = () => {
  const cs = getComputedStyle(document.documentElement).colorScheme;
  if (cs) return cs.includes('dark');
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/* ============================== 效果应用 ============================== */

/**
 * 祝福横幅（右下角，可关闭，自动消失）
 */
function showBanner(f) {
  const banner = document.createElement('div');
  banner.className = 'festival-banner';
  banner.dataset.festival = f.id;

  const icon = document.createElement('span');
  icon.className = 'festival-banner__icon';
  icon.textContent = f.icon || '🎉';

  const text = document.createElement('span');
  text.className = 'festival-banner__text';
  text.textContent = f.message || `${f.name}快乐！`;

  const close = document.createElement('button');
  close.className = 'festival-banner__close';
  close.type = 'button';
  close.setAttribute('aria-label', '关闭');
  close.textContent = '×';
  close.addEventListener('click', () => banner.remove());

  banner.append(icon, text, close);
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), BANNER_DURATION);
}

/**
 * 倒计时预告横幅（未命中节日、但临近声明了 pre 的节日时显示）
 */
function showPreBanner(f, delta) {
  const banner = document.createElement('div');
  banner.className = 'festival-banner';
  banner.dataset.festivalPre = f.id;

  const icon = document.createElement('span');
  icon.className = 'festival-banner__icon';
  icon.textContent = '🔔';

  const text = document.createElement('span');
  text.className = 'festival-banner__text';
  text.textContent = delta === 1 ? `明天就是${f.name}！` : `距离${f.name}还有 ${delta} 天`;

  const close = document.createElement('button');
  close.className = 'festival-banner__close';
  close.type = 'button';
  close.setAttribute('aria-label', '关闭');
  close.textContent = '×';
  close.addEventListener('click', () => banner.remove());

  banner.append(icon, text, close);
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), BANNER_DURATION);
}

/**
 * 纯 CSS 灯笼（顶部两侧悬挂，摇摆 + 流苏）
 * 若站点旧版灯笼脚本（.lantern）已渲染则跳过，避免重复
 */
function showLanterns(f) {
  if (document.querySelector('.lantern, .fest-lantern')) return;
  const [leftText, rightText] = f.id === 'yuanxiao' ? ['元宵', '快乐'] : ['新年', '快乐'];
  const lantern = (side, text) => `
    <div class="fest-lantern fest-lantern--${side}"><div class="fest-lantern__container">
      <div class="fest-lantern__top-rope"></div>
      <div class="fest-lantern__top"></div>
      <div class="fest-lantern__center">
        <div class="fest-lantern__line">
          <div class="fest-lantern__text-wrap"><div class="fest-lantern__text">${text}</div></div>
        </div>
      </div>
      <div class="fest-lantern__bottom"></div>
      <div class="fest-lantern__bottom-rope"></div>
    </div></div>`;
  const wrap = document.createElement('div');
  wrap.innerHTML = lantern('left', leftText) + lantern('right', rightText);
  document.body.appendChild(wrap);
}

/* 特效声明：节日条目上可写 effects: ['lantern','bunting','icicle','moon','confetti','firework','snow']
 * 写了以它为准；未写则回退到按 id 的默认特效表（向后兼容，自定义 id 也能直接配特效） */
const EFFECT_KEYS = {
  lantern: 'lanternFestivals',
  bunting: 'buntingFestivals',
  icicle: 'icicleFestivals',
  moon: 'moonFestivals',
  confetti: 'confettiFestivals',
  firework: 'fireworkFestivals',
  snow: 'snowFestivals',
};

const hasEffect = (f, name) =>
  Array.isArray(f.effects)
    ? f.effects.includes(name)
    : (config[EFFECT_KEYS[name]] || []).includes(f.id);

/**
 * 页首主题装饰：按节日挂拉花 / 冰凌 / 月夜
 */
function showDecor(f) {
  if (hasEffect(f, 'bunting')) addBunting();
  if (hasEffect(f, 'icicle')) addIcicles();
  if (hasEffect(f, 'moon')) addMoonScene();
}

function addBunting() {
  if (document.querySelector('.fest-bunting')) return;
  const bunting = document.createElement('div');
  bunting.className = 'fest-bunting';
  document.body.appendChild(bunting);
}

function addIcicles() {
  if (document.querySelector('.fest-icicles')) return;
  const header = document.querySelector('#header-desktop') || document.querySelector('#header-mobile');
  if (!header) return;
  const icicles = document.createElement('div');
  icicles.className = 'fest-icicles';
  header.appendChild(icicles);
}

function addMoonScene() {
  if (document.querySelector('.festival-decor')) return;
  const decor = document.createElement('div');
  decor.className = 'festival-decor';

  /* 星空：上半屏随机撒 40 颗星星，交错闪烁 */
  for (let i = 0; i < 40; i++) {
    const star = document.createElement('span');
    star.className = 'fest-star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 35}%`;
    star.style.animationDelay = `${Math.random() * 3}s`;
    star.style.animationDuration = `${2.4 + Math.random() * 2}s`;
    decor.appendChild(star);
  }

  /* 流云两朵 */
  for (const [cls, top, delay] of [['fest-cloud', '90px', '0s'], ['fest-cloud fest-cloud--2', '150px', '-30s']]) {
    const cloud = document.createElement('div');
    cloud.className = cls;
    cloud.style.top = `${top}px`;
    cloud.style.animationDelay = delay;
    decor.appendChild(cloud);
  }

  /* 圆月压轴 */
  const moon = document.createElement('div');
  moon.className = 'fest-moon';
  decor.appendChild(moon);

  document.body.appendChild(decor);
}

function launchConfetti(duration = 3000) {
  if (typeof window.confetti !== 'function') return;
  const colors = ['#ff4d4f', '#ffb84d', '#f8f8f8', '#ffd666', '#69c0ff'];
  const end = Date.now() + duration;
  (function frame() {
    window.confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors });
    window.confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/**
 * 背景烟花：几发礼花在页面上方炸开后自动移除 canvas
 */
function startFireworks(duration = 4000) {
  const canvas = document.createElement('canvas');
  canvas.className = 'festival-fireworks';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.remove();

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const palette = ['#ff4d4f', '#ffd666', '#69c0ff', '#fff1b8', '#ff85c0', '#95de64'];
  const rockets = [];
  const sparks = [];
  const start = Date.now();
  let lastLaunch = 0;
  let launched = 0;

  const launch = () => {
    rockets.push({
      x: window.innerWidth * (0.2 + Math.random() * 0.6),
      y: window.innerHeight,
      vx: (Math.random() - 0.5) * 1.4,
      vy: -(9 + Math.random() * 3),
      targetY: window.innerHeight * (0.2 + Math.random() * 0.2),
      color: palette[Math.floor(Math.random() * palette.length)],
    });
  };

  const explode = (r) => {
    const n = 60 + Math.floor(Math.random() * 40);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.12;
      const v = 2.4 + Math.random() * 3.6;
      sparks.push({
        x: r.x, y: r.y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 55 + Math.random() * 35,
        color: Math.random() < 0.85 ? r.color : '#fff',
      });
    }
  };

  (function frame() {
    const elapsed = Date.now() - start;
    if (elapsed > duration && !rockets.length && !sparks.length) {
      canvas.remove();
      window.removeEventListener('resize', resize);
      return;
    }
    if (elapsed <= duration && Date.now() - lastLaunch > 650 && launched < 6) {
      launch();
      launched++;
      lastLaunch = Date.now();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.x += r.vx;
      r.y += r.vy;
      r.vy += 0.14;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff8e1';
      ctx.fill();
      if (r.y <= r.targetY || r.vy >= 0) {
        explode(r);
        rockets.splice(i, 1);
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.05;
      s.vx *= 0.985;
      s.vy *= 0.985;
      s.life--;
      ctx.globalAlpha = Math.max(0, Math.min(1, s.life / 55));
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
      if (s.life <= 0) sparks.splice(i, 1);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  })();
}

function startSnow() {
  const canvas = document.createElement('canvas');
  canvas.className = 'festival-snow';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.remove();

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  /* 亮色模式下白雪不可见，改用冰蓝灰；暗色模式用白 */
  const rgb = isDarkScheme() ? '255, 255, 255' : '130, 160, 200';

  /* 三层景深：远景细小飘忽，中景柔光，近景六臂雪花晶体（大而快、带风偏移） */
  const LAYERS = [
    { share: 0.35, rMin: 0.8, rMax: 1.5, sMin: 0.35, sMax: 0.75, alpha: 0.35, depth: 0.4, kind: 'dot' },
    { share: 0.4, rMin: 1.9, rMax: 2.7, sMin: 0.9, sMax: 1.5, alpha: 0.5, depth: 0.7, kind: 'soft' },
    { share: 0.25, rMin: 4.2, rMax: 6, sMin: 1.7, sMax: 2.8, alpha: 0.9, depth: 1.2, kind: 'crystal' },
  ];

  const newFlake = (layer, initial) => ({
    layer,
    x: Math.random() * canvas.width,
    y: initial ? Math.random() * canvas.height : -10 - Math.random() * 40,
    r: layer.rMin + Math.random() * (layer.rMax - layer.rMin),
    speed: layer.sMin + Math.random() * (layer.sMax - layer.sMin),
    sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.008 + Math.random() * 0.02,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.03,
  });

  const flakes = [];
  for (const layer of LAYERS) {
    const n = Math.round(Math.min(110, Math.ceil(window.innerWidth / 12)) * layer.share);
    for (let i = 0; i < n; i++) flakes.push(newFlake(layer, true));
  }
  const start = Date.now();

  /* 风场：多个低频正弦叠加，缓慢转向并带阵风感 */
  const wind = (t) =>
    Math.sin(t / 4000) * 0.45 + Math.sin(t / 9000 + 1.3) * 0.3 + Math.sin(t / 23000 + 4) * 0.25;

  const drawCrystal = (x, y, r, rot, alpha) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
    ctx.lineWidth = Math.max(1, r * 0.32);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r;
      ctx.moveTo(0, 0);
      ctx.lineTo(dx, dy);
      /* 主臂 55% 处伸出两根 60° 侧枝 */
      const bx = dx * 0.55;
      const by = dy * 0.55;
      const bl = r * 0.38;
      for (const s of [-1, 1]) {
        const ba = a + s * Math.PI / 3;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl);
      }
    }
    ctx.stroke();
    ctx.restore();
  };

  (function frame() {
    if (Date.now() - start > SNOW_DURATION) {
      canvas.remove();
      window.removeEventListener('resize', resize);
      return;
    }
    const t = Date.now();
    const w = wind(t);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const fl of flakes) {
      fl.sway += fl.swaySpeed;
      fl.rot += fl.rotSpeed;
      fl.x += w * fl.layer.depth + Math.sin(fl.sway) * 0.5;
      fl.y += fl.speed;
      /* 左右环绕穿出后从另一侧回来 */
      if (fl.x < -20) fl.x = canvas.width + 20;
      if (fl.x > canvas.width + 20) fl.x = -20;
      if (fl.y > canvas.height + 10) Object.assign(fl, newFlake(fl.layer, false));

      if (fl.layer.kind === 'dot') {
        ctx.fillStyle = `rgba(${rgb}, ${fl.layer.alpha})`;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (fl.layer.kind === 'soft') {
        const g = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, fl.r * 1.8);
        g.addColorStop(0, `rgba(${rgb}, ${fl.layer.alpha})`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.r * 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawCrystal(fl.x, fl.y, fl.r, fl.rot, fl.layer.alpha);
      }
    }
    requestAnimationFrame(frame);
  })();
}

/**
 * 应用节日皮肤：data 属性 + 横幅 + 特效
 */
function apply(f) {
  const html = document.documentElement;
  html.dataset.festival = f.id;
  html.dataset.festivalLevel = String(f.level);

  console.log(
    `%c ${f.icon || '🎉'} 今天是${f.name} %c`,
    'font-size: 16px; font-weight: bold; color: #fff; background: linear-gradient(90deg, #ff6b6b, #ffb84d); padding: 4px 10px; border-radius: 6px;',
    ''
  );

  if (config.banner && f.level >= 2) showBanner(f);
  if (hasEffect(f, 'lantern')) showLanterns(f);
  showDecor(f);

  /* 注意：reduced-motion 只停 canvas 特效，灯笼/星空等 CSS 动画由各自的
   * @media (prefers-reduced-motion: no-preference) 单独控制（保留静态美感） */
  if (!config.effects || f.level < 3) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (hasEffect(f, 'confetti')) launchConfetti();
  if (hasEffect(f, 'firework')) startFireworks();
  if (hasEffect(f, 'snow')) startSnow();
}

/* ============================== 初始化 ============================== */

const config = { ...DEFAULT_CONFIG, ...(window.FixItFestivalConfig || {}) };

/* 归一化：任何数组字段被站点配置写坏（null / 非数组）都退回默认值，
 * 保证单个字段的配置错误不会让整条特效链静默失效 */
for (const key of [
  'mutedDates', 'festivals', 'snowFestivals', 'confettiFestivals', 'fireworkFestivals',
  'lanternFestivals', 'buntingFestivals', 'icicleFestivals', 'moonFestivals',
]) {
  if (!Array.isArray(config[key])) config[key] = DEFAULT_CONFIG[key];
}
config.festivals = config.festivals.filter((f) => f && typeof f === 'object' && f.id && f.type && f.date);


/* 'YYYY-MM-DD' → 本地日期（正午，避免时区偏移到前一天） */
const parseLocalDate = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

(function init() {
  const now = config.previewDate ? parseLocalDate(config.previewDate) : new Date();
  if (config.previewDate) console.info('[festival] 预览日期覆盖:', config.previewDate);

  if (isMuted(now, config.mutedDates)) {
    console.info('[festival] 哀悼日，已停用节日效果');
    return;
  }

  const solar2lunar = solarlunar.solar2lunar;
  const hit = pickFestival(config.festivals, now, solar2lunar);
  if (hit) {
    apply(hit);
    return;
  }

  /* 未命中任何节日：对声明了 pre 的节日做倒计时预告，取最近的一个 */
  if (!config.banner) return;
  const upcoming = config.festivals
    .filter((f) => Number.isFinite(f.pre) && f.pre >= 1)
    .map((f) => ({ f, delta: daysBefore(f, now, solar2lunar) }))
    .filter((x) => x.delta <= x.f.pre)
    .sort((a, b) => a.delta - b.delta)[0];
  if (upcoming) showPreBanner(upcoming.f, upcoming.delta);
})();
