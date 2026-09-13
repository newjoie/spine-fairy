/* 자세 타임라인 — 하루 중 언제 거북목이었는지를 시간축 위에 그린다.
 * 기존의 텍스트 목록("오후 7:45:59 부터 22초 동안 거북목")은 한눈에 들어오지
 * 않아 그래프로 대체했다. */
const PostureTimeline = (function () {
  const COLOR = { bad: '#C4703A', good: '#6A9A5B' };
  const LABEL = { bad: '거북목', good: '바른 자세' };

  /* 분 버킷을 연속 구간(run)으로 합친다. 측정되지 않은 분은 빈칸으로 남는다. */
  function toRuns(minutes) {
    const idx = Object.keys(minutes || {}).map(Number).filter(function (n) {
      return !isNaN(n) && minutes[n] && minutes[n].t > 0;
    }).sort(function (a, b) { return a - b; });

    if (!idx.length) return { runs: [], from: 0, to: 0 };

    const from = idx[0];
    const to = idx[idx.length - 1] + 1;
    const runs = [];

    idx.forEach(function (m) {
      const cell = minutes[m];
      const kind = cell.b > cell.t / 2 ? 'bad' : 'good';
      const last = runs[runs.length - 1];
      if (last && last.kind === kind && last.end === m) last.end = m + 1;
      else runs.push({ kind: kind, start: m, end: m + 1 });
    });

    return { runs: runs, from: from, to: to };
  }

  function summarize(minutes) {
    let bad = 0, total = 0;
    Object.keys(minutes || {}).forEach(function (k) {
      const c = minutes[k];
      if (!c) return;
      total += c.t || 0;
      bad += c.b || 0;
    });
    return { bad: bad, good: Math.max(0, total - bad), total: total };
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    ctx.fill();
  }

  function draw(canvas, minutes) {
    const data = toRuns(minutes);
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 600;
    const cssH = 180;

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.font = '12px Pretendard, -apple-system, sans-serif';

    if (!data.runs.length) {
      ctx.fillStyle = '#8A8D80';
      ctx.textAlign = 'center';
      ctx.fillText('아직 측정 기록이 없습니다.', cssW / 2, cssH / 2);
      return;
    }

    const padL = 74, padR = 12, padT = 16, laneH = 48, gap = 14;
    const lanes = { bad: padT, good: padT + laneH + gap };
    const bottom = padT + laneH * 2 + gap;

    /* 축 범위는 측정 구간을 시간 단위로 올림·내림해서 잡는다. */
    const start = Math.floor(data.from / 60) * 60;
    const end = Math.max(Math.ceil(data.to / 60) * 60, start + 60);
    const span = end - start;
    const plotW = cssW - padL - padR;
    const xOf = function (m) { return padL + (m - start) / span * plotW; };

    const hours = span / 60;
    const step = hours > 12 ? 3 : (hours > 6 ? 2 : 1);

    ctx.strokeStyle = '#E2E0D5';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8A8D80';
    ctx.textAlign = 'center';
    for (let h = start; h <= end; h += 60 * step) {
      const px = Math.round(xOf(h)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, bottom);
      ctx.stroke();
      ctx.fillText(((h / 60) % 24) + '시', px, cssH - 8);
    }

    ctx.textAlign = 'right';
    ['bad', 'good'].forEach(function (k) {
      ctx.fillStyle = COLOR[k];
      ctx.fillText(LABEL[k], padL - 14, lanes[k] + laneH / 2 + 4);
    });

    data.runs.forEach(function (r) {
      const x0 = xOf(r.start);
      const w = Math.max(xOf(r.end) - x0, 2.5);
      ctx.fillStyle = COLOR[r.kind];
      roundRect(ctx, x0, lanes[r.kind] + 7, w, laneH - 14, 4);
    });
  }

  /* 아래쪽 수치 목록. mode: 'time' | 'percent' */
  function renderSummary(el, minutes, mode) {
    const s = summarize(minutes);
    const rows = [
      { key: 'bad', value: s.bad },
      { key: 'good', value: s.good }
    ];

    el.innerHTML = '';
    rows.forEach(function (row) {
      const pct = s.total > 0 ? (row.value / s.total * 100) : 0;
      const div = document.createElement('div');
      div.className = 'tl-row';
      div.innerHTML =
        '<span class="tl-dot" style="background:' + COLOR[row.key] + '"></span>' +
        '<span class="tl-label">' + LABEL[row.key] + '</span>' +
        '<span class="tl-value">' +
        (mode === 'percent' ? pct.toFixed(1) + '%' : formatTime(row.value)) +
        '</span>';
      el.appendChild(div);
    });
  }

  return { draw: draw, summarize: summarize, renderSummary: renderSummary };
})();
