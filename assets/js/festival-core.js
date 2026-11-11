/**
 * festival-core.js — 日期匹配纯函数
 *
 * 无 DOM、无第三方依赖（农历 API 由调用方注入），可被 Node 直接加载做快照测试，
 * 防止 vendor（solarlunar）升级后农历匹配静默回归。
 * 测试加载方式：剥掉 `export ` 前缀后用 new Function 求值（见 preview/tests/snapshot.test.mjs），
 * 因此本文件只能使用「export const / export function」形式的导出，不要使用其它导出语法。
 */

export const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/**
 * 公历 Date → 农历对象；solarlunar 在 1900-01-01~30 及 2100 之后返回 -1（数字），
 * 统一归一化为 null，交给调用方跳过农历/节气匹配
 */
export const toLunar = (solar2lunar, d) => {
  const r = solar2lunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return typeof r === 'object' && r ? r : null;
};

/**
 * 是否命中哀悼日（如 '*-9-18'）
 */
export function isMuted(now, mutedDates) {
  const month = now.getMonth() + 1;
  const date = now.getDate();
  return mutedDates.some((md) => {
    const [y, m, d] = md.split('-');
    return (y === '*' || Number(y) === now.getFullYear()) && Number(m) === month && Number(d) === date;
  });
}

export function matchSolar(f, now) {
  const [m, d] = f.date.split('-').map(Number);
  const duration = f.duration || 1;
  /* 同时检查「上一年起始」的窗口，避免 12-31 起、跨年的 duration 在 1-1 漏判 */
  for (const year of [now.getFullYear() - 1, now.getFullYear()]) {
    const start = new Date(year, m - 1, d);
    if (now >= start && now < addDays(start, duration)) return true;
  }
  return false;
}

export function matchLunar(f, today, tomorrow) {
  if (!today || !tomorrow) return false;
  const [m, d] = f.date.split('-').map(Number);
  // 除夕特殊处理：腊月最后一天（廿九或三十，次年正月初一的前一天）
  if (m === 12 && d === 30) {
    return today.lMonth === 12 && tomorrow.lMonth === 1 && tomorrow.lDay === 1;
  }
  return !today.isLeap && today.lMonth === m && today.lDay === d;
}

export function matchTerm(f, today) {
  if (!today) return false;
  return Boolean(today.isTerm) && today.term === f.date;
}

export function matchFestival(f, now, today, tomorrow) {
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

/* 内置节日表（默认配置与快照测试共用同一份数据） */
export const DEFAULT_FESTIVALS = [
  { id: 'newyear',   type: 'solar', date: '1-1',   name: '元旦',   level: 3, icon: '🎊' },
  { id: 'chunjie',   type: 'lunar', date: '1-1',   name: '春节',   level: 3, icon: '🏮', message: '新春快乐，万事胜意！', pre: 7 },
  { id: 'yuanxiao',  type: 'lunar', date: '1-15',  name: '元宵节', level: 2, icon: '🍡' },
  { id: 'qingming',  type: 'term',  date: '清明',   name: '清明',   level: 1 },
  { id: 'wuyi',      type: 'solar', date: '5-1',   name: '劳动节', level: 2, icon: '🛠️' },
  { id: 'duanwu',    type: 'lunar', date: '5-5',   name: '端午节', level: 2, icon: '🥟' },
  { id: 'qixi',      type: 'lunar', date: '7-7',   name: '七夕',   level: 2, icon: '💌' },
  { id: 'zhongqiu',  type: 'lunar', date: '8-15',  name: '中秋节', level: 2, icon: '🌕', message: '花好月圆，千里共婵娟', pre: 3 },
  { id: 'guoqing',   type: 'solar', date: '10-1',  name: '国庆节', level: 3, icon: '🎊', duration: 3 },
  { id: 'chongyang', type: 'lunar', date: '9-9',   name: '重阳节', level: 1, icon: '🍂' },
  { id: 'laba',      type: 'lunar', date: '12-8',  name: '腊八节', level: 1, icon: '🥣' },
  { id: 'dongzhi',   type: 'term',  date: '冬至',   name: '冬至',   level: 3, icon: '❄️', message: '冬至大如年，愿君温暖过冬', pre: 3 },
  { id: 'chuxi',     type: 'lunar', date: '12-30', name: '除夕',   level: 3, icon: '🧨', message: '辞旧迎新，阖家团圆！' },
  { id: 'shengdan',  type: 'solar', date: '12-25', name: '圣诞节', level: 3, icon: '🎄', pre: 5 },
];

/**
 * 在候选节日中找出当天命中的节日，按 level 降序取第一个；无命中返回 null
 */
export function pickFestival(festivals, now, solar2lunar) {
  const today = toLunar(solar2lunar, now);
  const tomorrow = toLunar(solar2lunar, addDays(now, 1));
  const matched = festivals
    .map((f) => ({ ...f, matched: matchFestival(f, now, today, tomorrow) }))
    .filter((f) => f.matched)
    .sort((a, b) => b.level - a.level);
  return matched[0] || null;
}

/**
 * 距离某节日下一次窗口起始的天数（1 = 明天进入窗口）；向前逐日扫描至多 400 天，
 * 找不到返回 Infinity。调用方保证「当天未命中」时才调用。
 */
export function daysBefore(f, now, solar2lunar) {
  for (let i = 1; i <= 400; i++) {
    const d = addDays(now, i);
    const today = toLunar(solar2lunar, d);
    const tomorrow = toLunar(solar2lunar, addDays(d, 1));
    if (matchFestival(f, d, today, tomorrow)) return i;
  }
  return Infinity;
}
