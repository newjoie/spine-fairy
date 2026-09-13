/* 척추의 요정 - 측정 데이터 저장소
 * 2024년 버전에는 저장소가 없어 새로고침 시 기록이 사라지고,
 * 통계 페이지 데이터가 하드코딩되어 있었다. 이 모듈이 두 페이지를 연결한다. */
const PostureStore = (function () {
  const KEY = 'spine-fairy-v2';
  const KEEP_DAYS = 60;

  function blank() {
    /* minutes: 분 단위 버킷. { 분index(0~1439): { b: 거북목초, t: 측정된초 } }
     * 타임라인 그래프를 그리려면 집계값이 아니라 '언제' 정보가 필요하다.
     * 측정한 분만 저장하는 희소 구조라 하루치가 수 KB 수준이다. */
    return { total: 0, bad: 0, longestBad: 0, alerts: 0, minutes: {} };
  }

  function loadAll() {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.days) return parsed;
    } catch (e) {
      console.warn('저장소 읽기 실패, 초기화합니다.', e);
    }
    return { days: {} };
  }

  function saveAll(store) {
    const keys = Object.keys(store.days).sort();
    while (keys.length > KEEP_DAYS) delete store.days[keys.shift()];
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('저장소 쓰기 실패', e);
    }
  }

  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function getDay(key) {
    const store = loadAll();
    const rec = Object.assign(blank(), store.days[key] || {});
    if (!rec.minutes || typeof rec.minutes !== 'object') rec.minutes = {};
    return rec;
  }

  function setDay(key, rec) {
    const store = loadAll();
    store.days[key] = rec;
    saveAll(store);
  }

  /* 최근 n일을 오래된 순으로 반환. 기록이 없는 날도 0으로 채워 빈 칸이 생기지 않게 한다. */
  function lastDays(n) {
    const store = loadAll();
    const out = [];
    const names = ['일', '월', '화', '수', '목', '금', '토'];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      out.push({
        key: key,
        label: (d.getMonth() + 1) + '/' + d.getDate() + '(' + names[d.getDay()] + ')',
        rec: Object.assign(blank(), store.days[key] || {})
      });
    }
    return out;
  }

  function resetAll() {
    localStorage.removeItem(KEY);
  }

  /* --- 사용자 설정 ---------------------------------------------------
   * 알림 주기와 판정 지속 시간은 사람마다 적정값이 다르므로 설정으로 뺀다. */
  const SETTINGS_KEY = 'spine-fairy-settings';
  const DEFAULT_SETTINGS = { alertIntervalMin: 5, holdSec: 20 };

  function getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return Object.assign({}, DEFAULT_SETTINGS, raw ? JSON.parse(raw) : {});
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function setSettings(patch) {
    const next = Object.assign(getSettings(), patch);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('설정 저장 실패', e);
    }
    return next;
  }

  return {
    blank: blank,
    todayKey: todayKey,
    getDay: getDay,
    setDay: setDay,
    lastDays: lastDays,
    resetAll: resetAll,
    getSettings: getSettings,
    setSettings: setSettings
  };
})();

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return hrs + '시간 ' + mins + '분 ' + secs + '초';
  if (mins > 0) return mins + '분 ' + secs + '초';
  return secs + '초';
}
