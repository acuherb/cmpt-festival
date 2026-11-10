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
   * 节日表。
   * type: solar（公历 M-D）/ lunar（农历 M-D）/ term（节气名）
   * level: 1 仅换肤；2 换肤+横幅；3 换肤+横幅+特效
   * duration: 生效天数（含当天），默认 1
   */
  festivals: [
    { id: 'newyear',   type: 'solar', date: '1-1',   name: '元旦',   level: 2, icon: '🎊' },
    { id: 'chunjie',   type: 'lunar', date: '1-1',   name: '春节',   level: 3, icon: '🏮', message: '新春快乐，万事胜意！' },
    { id: 'yuanxiao',  type: 'lunar', date: '1-15',  name: '元宵节', level: 2, icon: '🍡' },
    { id: 'qingming',  type: 'term',  date: '清明',   name: '清明',   level: 1 },
    { id: 'wuyi',      type: 'solar', date: '5-1',   name: '劳动节', level: 2, icon: '🛠️' },
    { id: 'duanwu',    type: 'lunar', date: '5-5',   name: '端午节', level: 2, icon: '🥟' },
    { id: 'qixi',      type: 'lunar', date: '7-7',   name: '七夕',   level: 2, icon: '💌' },
    { id: 'zhongqiu',  type: 'lunar', date: '8-15',  name: '中秋节', level: 2, icon: '🌕', message: '花好月圆，千里共婵娟' },
    { id: 'guoqing',   type: 'solar', date: '10-1',  name: '国庆节', level: 2, icon: '🎊', duration: 3 },
    { id: 'chongyang', type: 'lunar', date: '9-9',   name: '重阳节', level: 1, icon: '🍂' },
    { id: 'laba',      type: 'lunar', date: '12-8',  name: '腊八节', level: 1, icon: '🥣' },
    { id: 'dongzhi',   type: 'term',  date: '冬至',   name: '冬至',   level: 2, icon: '❄️', message: '冬至大如年，愿君温暖过冬' },
    { id: 'chuxi',     type: 'lunar', date: '12-30', name: '除夕',   level: 3, icon: '🧨', message: '辞旧迎新，阖家团圆！' },
    { id: 'shengdan',  type: 'solar', date: '12-25', name: '圣诞节', level: 2, icon: '🎄' },
  ],
  /** 飘雪特效节日 */
  snowFestivals: ['shengdan', 'dongzhi'],
  /** 彩带特效节日（需 level >= 3） */
  confettiFestivals: ['chunjie', 'chuxi', 'newyear'],
};

const SNOW_DURATION = 20000;
const BANNER_DURATION = 8000;

/* ============================== 工具函数 ============================== */

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const lunarOf = (d) => solarlunar.solar2lunar(d.getFullYear(), d.getMonth() + 1, d.getDate());

/**
 * 是否命中哀悼日（如 *-9-18）
 */
function isMuted(now, mutedDates) {
  const month = now.getMonth() + 1;
  const date = now.getDate();
  return mutedDates.some((md) => {
    const [y, m, d] = md.split('-');
    return (y === '*' || Number(y) === now.getFullYear()) && Number(m) === month && Number(d) === date;
  });
}

function matchSolar(f, now) {
  const [m, d] = f.date.split('-').map(Number);
  const start = new Date(now.getFullYear(), m - 1, d);
  return now >= start && now < addDays(start, f.duration || 1);
}

function matchLunar(f, today, tomorrow) {
  const [m, d] = f.date.split('-').map(Number);
  // 除夕特殊处理：腊月最后一天（廿九或三十，次年正月初一的前一天）
  if (m === 12 && d === 30) {
    return today.lMonth === 12 && tomorrow.lMonth === 1 && tomorrow.lDay === 1;
  }
  return !today.isLeap && today.lMonth === m && today.lDay === d;
}

function matchTerm(f, today) {
  return Boolean(today.isTerm) && today.term === f.date;
}

function matchFestival(f, now, today, tomorrow) {
  switch (f.type) {
    case 'solar':
      return matchSolar(f, now);
    case 'lunar':
      return matchLunar(f, today, tomorrow);
    case 'term':
      return matchTerm(f, today);
    default:
      return false;
  }
}

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

function launchConfetti(duration = 3000) {
  const colors = ['#ff4d4f', '#ffb84d', '#f8f8f8', '#ffd666', '#69c0ff'];
  const end = Date.now() + duration;
  (function frame() {
    window.confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors });
    window.confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
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

  const newFlake = (initial) => ({
    x: Math.random() * canvas.width,
    y: initial ? Math.random() * canvas.height : -10,
    r: 1.2 + Math.random() * 2.4,
    speed: 0.6 + Math.random() * 1.4,
    sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.008 + Math.random() * 0.02,
  });

  const flakes = Array.from({ length: Math.min(80, Math.ceil(window.innerWidth / 16)) }, () => newFlake(true));
  const start = Date.now();

  (function frame() {
    if (Date.now() - start > SNOW_DURATION) {
      canvas.remove();
      window.removeEventListener('resize', resize);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (const fl of flakes) {
      fl.sway += fl.swaySpeed;
      fl.x += Math.sin(fl.sway);
      fl.y += fl.speed;
      if (fl.y > canvas.height + 10) Object.assign(fl, newFlake(false));
      ctx.beginPath();
      ctx.arc(fl.x, fl.y, fl.r, 0, Math.PI * 2);
      ctx.fill();
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

  if (!config.effects || f.level < 3) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (config.confettiFestivals.includes(f.id)) launchConfetti();
  if (config.snowFestivals.includes(f.id)) startSnow();
}

/* ============================== 初始化 ============================== */

const config = { ...DEFAULT_CONFIG, ...(window.FixItFestivalConfig || {}) };

(function init() {
  const now = new Date();

  if (isMuted(now, config.mutedDates)) {
    console.info('[festival] 哀悼日，已停用节日效果');
    return;
  }

  const today = lunarOf(now);
  const tomorrow = lunarOf(addDays(now, 1));

  const matched = config.festivals
    .map((f) => ({ ...f, matched: matchFestival(f, now, today, tomorrow) }))
    .filter((f) => f.matched)
    .sort((a, b) => b.level - a.level);

  if (matched.length) apply(matched[0]);
})();
