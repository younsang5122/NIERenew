// ============================================================
// 생태 탐험 헤더 — 스크롤 스크러빙(Scroll Scrubbing)
// 드론 항공 촬영 영상을 프레임 시퀀스로 추출해 스크롤 진행률에 매핑.
// 텍스트/버튼(HUD)은 position:sticky 레이어로 고정, 이미지 프레임만 교체.
// ============================================================
(function(){
  var hero = document.querySelector('.scrub-hero');
  if(!hero) return;

  var canvas = hero.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var fallbackImg = hero.querySelector('.scrub-fallback');
  var frameCount = parseInt(hero.getAttribute('data-frame-count'), 10) || 80;
  var basePath = hero.getAttribute('data-frame-path') || 'assets/frames/scrub_';
  var pad = 3;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function framePath(i){
    return basePath + String(i).padStart(pad, '0') + '.jpg';
  }

  // 텔레메트리(비행 정보) 표시용 요소
  var elAlt = hero.querySelector('[data-t-alt]');
  var elCoord = hero.querySelector('[data-t-coord]');
  var elFrame = hero.querySelector('[data-t-frame]');
  var elBar = hero.querySelector('[data-t-bar]');

  // 국립생태원 좌표 근방에서 살짝 이동하는 것처럼 보이도록 하는 가상 궤적
  var baseLat = 36.0075, baseLng = 126.6917;

  if(reduceMotion){
    // 모션 최소화: 정지 이미지(마지막 프레임) 한 장만 표시
    fallbackImg.src = framePath(Math.round(frameCount * 0.4));
    fallbackImg.style.display = 'block';
    canvas.style.display = 'none';
    if(elAlt) elAlt.textContent = '128m';
    if(elCoord) elCoord.textContent = baseLat.toFixed(4) + '° N, ' + baseLng.toFixed(4) + '° E';
    if(elBar) elBar.style.width = '40%';
    return;
  }

  var images = new Array(frameCount);
  var loadedCount = 0;
  var ready = false;

  function drawFrame(idx){
    var img = images[idx];
    if(!img || !img.complete || img.naturalWidth === 0) return;
    var cw = canvas.width, ch = canvas.height;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var s = Math.max(cw / iw, ch / ih);
    var dw = iw * s, dh = ih * s;
    var dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    ctx.clearRect(0,0,cw,ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function resizeCanvas(){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = hero.clientWidth * dpr;
    canvas.height = window.innerHeight * dpr;
  }

  var currentIndex = 0;

  function updateTelemetry(progress, idx){
    if(elAlt){
      var alt = Math.round(38 + progress * 210);
      elAlt.textContent = alt + 'm';
    }
    if(elCoord){
      var lat = baseLat + progress * 0.0062;
      var lng = baseLng + Math.sin(progress * Math.PI) * 0.0048;
      elCoord.textContent = lat.toFixed(4) + '° N, ' + lng.toFixed(4) + '° E';
    }
    if(elFrame){
      elFrame.textContent = String(idx + 1).padStart(2,'0') + ' / ' + String(frameCount).padStart(2,'0');
    }
    if(elBar){
      elBar.style.width = (progress * 100).toFixed(1) + '%';
    }
  }

  var ticking = false;
  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      var rect = hero.getBoundingClientRect();
      var scrollable = hero.offsetHeight - window.innerHeight;
      var progress = scrollable > 0 ? (-rect.top) / scrollable : 0;
      progress = Math.max(0, Math.min(1, progress));
      var idx = Math.min(frameCount - 1, Math.round(progress * (frameCount - 1)));
      if(ready && idx !== currentIndex){
        currentIndex = idx;
        drawFrame(idx);
      } else if(ready && idx === 0){
        drawFrame(0);
      }
      updateTelemetry(progress, idx);
      ticking = false;
    });
  }

  // 우선 첫 프레임부터 순서대로 로드하여 빠르게 표시, 이후 나머지 프리로드
  function loadFrame(i){
    return new Promise(function(resolve){
      var img = new Image();
      img.onload = function(){ loadedCount++; resolve(); };
      img.onerror = function(){ loadedCount++; resolve(); };
      img.src = framePath(i + 1);
      images[i] = img;
    });
  }

  resizeCanvas();

  loadFrame(0).then(function(){
    ready = true;
    drawFrame(0);
    updateTelemetry(0, 0);
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();

    // 나머지 프레임 순차 프리로드 (체감 성능을 위해 앞부분부터)
    var idx = 1;
    function loadNext(){
      if(idx >= frameCount) return;
      loadFrame(idx).then(function(){
        idx++;
        if(idx < frameCount) loadNext();
      });
    }
    loadNext();
  });

  window.addEventListener('resize', function(){
    resizeCanvas();
    drawFrame(currentIndex);
  });
})();
