// ============================================================
// index.html 전용 — Scroll Scrubbing 인터랙션 엔진
// ------------------------------------------------------------
// 기존 main.js([data-reveal] 1회성 페이드)·parallax.js([data-parallax])는
// 그대로 유지됩니다. 이 파일은 "스크롤 위치 = 애니메이션 진행도"로 직접
// 연결되는 효과 중, 기존 스크립트가 아직 다루지 않는 영역만 추가합니다.
// 새 Section이나 마크업을 만들지 않고, 이미 존재하는 요소에
// transform·opacity 인라인 스타일을 requestAnimationFrame으로 갱신하는
// 방식으로만 동작합니다.
//
// [담당 범위를 좁힌 이유]
// data.js를 확인한 결과 #eco-panel(대표 생물 카드), #linked-programs
// (연계 프로그램 카드)는 렌더링 시점부터 이미 data-parallax 속성이 붙어
// 나오며, 기존 parallax.js가 요소별 진입 진행도(0~1)에 따라 opacity·
// translateY·scale을 "이미" 연속적으로(=스크러빙 방식으로) 갱신하고
// 있습니다. 여기에 이 파일이 같은 요소의 style.transform을 또 갱신하면
// 두 스크립트가 매 프레임 서로 다른 값을 덮어써 미세하게 떨리는(jitter)
// 충돌이 생깁니다. 따라서 이 두 영역은 기존 parallax.js에 그대로
// 위임하고, 이 파일은 아래 4가지 — 아직 스크러빙 처리가 안 되어 있던
// 부분 — 만 새로 담당합니다.
//
// 담당 영역
//   1) 생태 탐험 히어로 HUD(제목/설명/버튼)
//      — scrub.js와 동일한 방식으로 히어로 자체의 스크롤 진행도를 구해,
//        진입 초반(0~10%)에 제목→설명→버튼 순으로 살짝 늦게 나타나고,
//        히어로를 거의 다 빠져나갈 때(82~100%) 은은하게 잦아든다.
//   2) 각 Section 제목/설명(.section-head 안의 h2 / p)
//      — 제목이 먼저, 설명이 뒤이어 나타나도록 시차를 둔다.
//        (히어로·.section-head 요소들은 data-parallax가 없으므로 충돌 없음)
//   3) 기후대 탭(#eco-tabs 버튼들) — data.js가 만드는 버튼에는 reveal/
//      parallax 속성이 전혀 없어 즉시 나타나던 부분. 작은 아이콘형
//      순차 리빌(opacity + scale)을 추가한다.
//   4) Section 전환 — 화면 위로 완전히 지나간 Section 컨테이너만 아주
//      살짝 가라앉듯 페이드(다음 콘텐츠를 가리지 않는 선에서만 적용)
//
// #eco-tabs 는 data.js가 비동기로 채우는 영역이라 DOM이 늦게 생긴다.
// MutationObserver로 감지해 자동으로 이 시스템에 편입시킨다.
// ============================================================
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function isMobile() { return window.innerWidth <= 768; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // rect 기준 0~1 진행도 계산.
  // startVH: 진행도가 0이 되는 지점(뷰포트 상단 기준 비율, 1=뷰포트 맨 아래)
  // endVH  : 진행도가 1이 되는 지점
  function progressForRect(rect, startVH, endVH) {
    var vh = window.innerHeight;
    var start = vh * startVH;
    var end = vh * endVH;
    if (start === end) return rect.top <= end ? 1 : 0;
    return clamp((start - rect.top) / (start - end), 0, 1);
  }

  // ------------------------------------------------------------
  // prefers-reduced-motion: 애니메이션 없이 최종 상태로 바로 표시
  // ------------------------------------------------------------
  if (reduceMotion) {
    var finalize = function (root) {
      (root || document)
        .querySelectorAll(
          '.scrub-title h1, .scrub-title p, .scrub-actions, ' +
          '.section-head h2, .section-head p, #eco-tabs > *'
        )
        .forEach(function (el) {
          el.style.opacity = '1';
          el.style.transform = 'none';
        });
    };
    finalize();
    if ('MutationObserver' in window) {
      new MutationObserver(function () { finalize(); }).observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    return;
  }

  var mobile = isMobile();
  window.addEventListener('resize', function () { mobile = isMobile(); });

  // ------------------------------------------------------------
  // 1) 히어로 HUD
  // ------------------------------------------------------------
  var hero = document.querySelector('.scrub-hero');
  var heroTitle = hero && hero.querySelector('.scrub-title h1');
  var heroDesc = hero && hero.querySelector('.scrub-title p');
  var heroActions = hero && hero.querySelector('.scrub-actions');
  [heroTitle, heroDesc, heroActions].forEach(function (el) {
    if (el) el.style.willChange = 'transform, opacity';
  });

  function paintHero() {
    if (!hero) return;
    var rect = hero.getBoundingClientRect();
    var scrollable = hero.offsetHeight - window.innerHeight;
    var progress = scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 0;

    var pOut = clamp((progress - 0.82) / 0.18, 0, 1); // 82~100%: 은은히 사라짐
    var yUp = mobile ? 24 : 40;

    if (heroTitle) {
      var pInTitle = clamp(progress / 0.1, 0, 1); // 0~10%: 등장
      var vTitle = pInTitle * (1 - pOut);
      heroTitle.style.opacity = vTitle.toFixed(3);
      heroTitle.style.transform =
        'translateY(' + (lerp(yUp, 0, pInTitle) + lerp(0, -14, pOut)).toFixed(1) + 'px)';
    }
    if (heroDesc) {
      var pInDesc = clamp((progress - 0.02) / 0.1, 0, 1); // 제목보다 살짝 늦게
      var vDesc = pInDesc * (1 - pOut);
      heroDesc.style.opacity = vDesc.toFixed(3);
      heroDesc.style.transform =
        'translateY(' + (lerp(mobile ? 16 : 25, 0, pInDesc) + lerp(0, -10, pOut)).toFixed(1) + 'px)';
    }
    if (heroActions) {
      var pInAct = clamp((progress - 0.04) / 0.1, 0, 1); // 설명보다 더 늦게
      var vAct = pInAct * (1 - pOut);
      heroActions.style.opacity = vAct.toFixed(3);
      heroActions.style.transform =
        'translateY(' + (lerp(18, 0, pInAct) + lerp(0, -8, pOut)).toFixed(1) + 'px)';
    }
  }

  // ------------------------------------------------------------
  // 2) Section 제목 / 설명 — .section-head 안의 h2·p를 시차를 두고 리빌
  // ------------------------------------------------------------
  function collectSectionHeads() {
    return Array.prototype.slice.call(document.querySelectorAll('.section-head'));
  }
  function ensureHeadReady(el) {
    if (el.__scrubReady) return;
    el.__scrubReady = true;
    var h2 = el.querySelector('h2');
    var p = el.querySelector('p');
    [h2, p].forEach(function (node) {
      if (node) node.style.willChange = 'transform, opacity';
    });
  }
  function paintSectionHead(el) {
    var h2 = el.querySelector('h2');
    var p = el.querySelector('p');
    var rect = el.getBoundingClientRect();
    var base = progressForRect(rect, 0.92, 0.55);
    var titleP = clamp(base / 0.7, 0, 1);
    var descP = clamp((base - 0.3) / 0.7, 0, 1); // 제목이 어느 정도 진행된 뒤 시작
    var yTitle = mobile ? 26 : 40;
    var yDesc = mobile ? 16 : 25;
    if (h2) {
      h2.style.opacity = titleP.toFixed(3);
      h2.style.transform = 'translateY(' + lerp(yTitle, 0, titleP).toFixed(1) + 'px)';
    }
    if (p) {
      p.style.opacity = descP.toFixed(3);
      p.style.transform = 'translateY(' + lerp(yDesc, 0, descP).toFixed(1) + 'px)';
    }
  }

  // ------------------------------------------------------------
  // 3) 기후대 탭(#eco-tabs) — 작은 아이콘/칩형 요소이므로 opacity + scale
  //    위주의 절제된 순차 리빌만 적용한다(큰 이동·회전 없음).
  //    data.js는 최초 렌더링 이후 탭을 다시 그리지 않고 class만 토글하므로
  //    시그니처가 바뀌었을 때만 재스캔한다.
  // ------------------------------------------------------------
  var tabsContainer = document.getElementById('eco-tabs');
  var tabsSignature = '';

  function refreshTabs() {
    if (!tabsContainer || !tabsContainer.children.length) return;
    var children = Array.prototype.slice.call(tabsContainer.children).filter(function (c) {
      return c.nodeType === 1;
    });
    var sig = children.length + ':' + tabsContainer.innerHTML.length;
    if (sig === tabsSignature) return;
    tabsSignature = sig;
    tabsContainer.__scrubChildren = children;
    tabsContainer.__scrubReady = true;
    children.forEach(function (c) { c.style.willChange = 'transform, opacity'; });
  }

  function paintTabs() {
    var children = tabsContainer && tabsContainer.__scrubChildren;
    if (!children || !children.length) return;
    var rect = tabsContainer.getBoundingClientRect();
    var containerP = progressForRect(rect, 0.95, 0.55);
    var n = children.length;
    var windowSize = 0.55; // 겹치는 구간(전부 겹쳐 촘촘하게 순서대로 등장)
    var step = n > 1 ? (1 - windowSize) / (n - 1) : 0;

    children.forEach(function (child, i) {
      var start = i * step;
      var end = start + windowSize;
      var p = clamp((containerP - start) / (end - start), 0, 1);
      child.style.opacity = p.toFixed(3);
      child.style.transform = 'scale(' + lerp(0.8, 1, p).toFixed(3) + ')';
    });
  }

  // ------------------------------------------------------------
  // 4) Section 전환 — 화면 위로 완전히 지나간 Section만 아주 미세하게
  //    가라앉듯 페이드(다음 콘텐츠를 가리지 않는 선에서만 적용, 데스크톱 전용)
  // ------------------------------------------------------------
  var transitionSections = Array.prototype.slice.call(document.querySelectorAll('main > .section'));
  transitionSections.forEach(function (s) {
    s.style.willChange = 'transform, opacity';
  });

  function paintTransitions() {
    if (mobile) return; // 모바일에서는 가독성·성능을 위해 미적용
    transitionSections.forEach(function (s) {
      var rect = s.getBoundingClientRect();
      if (rect.bottom > 0 && rect.bottom < window.innerHeight * 0.4) {
        var p = clamp(1 - rect.bottom / (window.innerHeight * 0.4), 0, 1);
        s.style.opacity = (1 - p * 0.06).toFixed(3);
        s.style.transform = 'scale(' + (1 - p * 0.015).toFixed(4) + ')';
      } else {
        s.style.opacity = '1';
        s.style.transform = 'none';
      }
    });
  }

  // ------------------------------------------------------------
  // 메인 루프
  // ------------------------------------------------------------
  var ticking = false;
  function paint() {
    paintHero();
    collectSectionHeads().forEach(function (el) {
      ensureHeadReady(el);
      paintSectionHead(el);
    });
    paintTabs();
    paintTransitions();
    ticking = false;
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(paint);
  }

  function init() {
    collectSectionHeads().forEach(ensureHeadReady);
    refreshTabs();
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  // data.js가 비동기로 #eco-tabs를 채운 뒤에도 자동으로 감지해
  // 이 시스템에 편입시킨다.
  if ('MutationObserver' in window) {
    var mo = new MutationObserver(function () {
      refreshTabs();
      onScroll();
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
