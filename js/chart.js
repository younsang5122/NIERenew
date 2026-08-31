// ============================================================
// 가벼운 캔버스 라인 차트 — 외부 CDN 의존 없이 연구 데이터를 시각화합니다.
// research.json 의 temperature-trend.data 를 그립니다.
// ============================================================
(function(){
  function drawLineChart(canvas, points, opts){
    opts = opts || {};
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(rect.width, 280);
    var h = Math.max(rect.height, 220);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    var pad = { top: 26, right: 22, bottom: 34, left: 46 };
    var plotW = w - pad.left - pad.right;
    var plotH = h - pad.top - pad.bottom;

    var xs = points.map(function(p){ return p.year; });
    var ys = points.map(function(p){ return p.tempAnomaly; });
    var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
    var yMin = Math.min(0, Math.min.apply(null, ys) - 0.2);
    var yMax = Math.max.apply(null, ys) + 0.25;

    function xPos(x){ return pad.left + ((x - xMin) / (xMax - xMin)) * plotW; }
    function yPos(y){ return pad.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH; }

    // 격자선 + y축 라벨
    ctx.strokeStyle = 'rgba(21,33,26,0.10)';
    ctx.fillStyle = '#4b594e';
    ctx.font = '11px Pretendard, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    var ySteps = 4;
    for(var i = 0; i <= ySteps; i++){
      var yVal = yMin + ((yMax - yMin) / ySteps) * i;
      var yy = yPos(yVal);
      ctx.beginPath();
      ctx.moveTo(pad.left, yy);
      ctx.lineTo(w - pad.right, yy);
      ctx.stroke();
      ctx.fillText(yVal.toFixed(1) + '℃', pad.left - 8, yy);
    }

    // x축 라벨
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    points.forEach(function(p){
      ctx.fillText(String(p.year), xPos(p.year), h - pad.bottom + 8);
    });

    // 영역 채우기 (그라디언트)
    var grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    grad.addColorStop(0, 'rgba(192,140,62,0.35)');
    grad.addColorStop(1, 'rgba(192,140,62,0.02)');
    ctx.beginPath();
    points.forEach(function(p, i){
      var x = xPos(p.year), y = yPos(p.tempAnomaly);
      if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(xPos(xMax), yPos(yMin));
    ctx.lineTo(xPos(xMin), yPos(yMin));
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // 라인
    ctx.beginPath();
    points.forEach(function(p, i){
      var x = xPos(p.year), y = yPos(p.tempAnomaly);
      if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#c08c3e';
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 점 + 값
    ctx.font = '600 11px Pretendard, sans-serif';
    points.forEach(function(p){
      var x = xPos(p.year), y = yPos(p.tempAnomaly);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#a6752f';
      ctx.stroke();

      ctx.fillStyle = '#1c3b29';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('+' + p.tempAnomaly.toFixed(1) + '℃', x, y - 8);
    });

    if(opts.title){
      ctx.fillStyle = '#15211a';
      ctx.font = '700 12.5px Pretendard, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.title, pad.left, 4);
    }
  }

  window.NIECharts = { drawLineChart: drawLineChart };
})();
