// ============================================================
// 섹션 스크롤 패럴랙스 — [data-parallax] 요소 전용
// scrub.js와 동일한 방식(requestAnimationFrame 스로틀, passive 스크롤 리스너)으로
// 요소가 뷰포트 하단에 들어오기 시작하면 progress=0,
// 뷰포트 중앙을 지나면 progress=1이 되도록 계산해
// translateY / opacity / scale 을 스크롤 진행률에 실시간으로 연동합니다.
//
// 기존 data-reveal(1회성 IntersectionObserver 페이드인)과는 별개로 동작하며,
// 두 속성을 함께 붙여도 서로 충돌하지 않습니다.
// ============================================================
(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var TRANSLATE_Y = 24;   // px — progress 0일 때의 시작 오프셋
  var SCALE_FROM = 0.96;  // progress 0일 때의 시작 스케일

  function collect(){
    return Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  }

  function applyFinalState(el){
    el.style.transform = 'none';
    el.style.opacity = '1';
  }

  // -----------------------------------------------------------
  // 모션 최소화 사용자: 애니메이션 없이 바로 최종 상태로 표시
  // -----------------------------------------------------------
  if(reduceMotion){
    collect().forEach(applyFinalState);
    if('MutationObserver' in window){
      new MutationObserver(function(mutations){
        mutations.forEach(function(m){
          m.addedNodes.forEach(function(node){
            if(node.nodeType !== 1) return;
            if(node.matches && node.matches('[data-parallax]')) applyFinalState(node);
            if(node.querySelectorAll){
              node.querySelectorAll('[data-parallax]').forEach(applyFinalState);
            }
          });
        });
      }).observe(document.body, { childList:true, subtree:true });
    }
    return;
  }

  // -----------------------------------------------------------
  // 진행률(progress) 계산
  // 0: 요소 상단이 뷰포트 하단에 막 들어오는 시점
  // 1: 요소 중앙이 뷰포트 중앙을 지나는 시점
  // -----------------------------------------------------------
  function progressFor(el){
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight;
    var denom = (vh / 2) + (rect.height / 2);
    if(denom <= 0) return 1;
    var p = (vh - rect.top) / denom;
    return Math.max(0, Math.min(1, p));
  }

  function paint(){
    collect().forEach(function(el){
      var p = progressFor(el);
      var y = TRANSLATE_Y * (1 - p);
      var s = SCALE_FROM + (1 - SCALE_FROM) * p;
      el.style.transform = 'translateY(' + y.toFixed(2) + 'px) scale(' + s.toFixed(3) + ')';
      el.style.opacity = p.toFixed(3);
    });
    ticking = false;
  }

  var ticking = false;
  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(paint);
  }

  function init(){
    collect().forEach(function(el){
      el.style.willChange = 'transform, opacity';
    });
    paint();
    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('resize', onScroll, { passive:true });
  }

  // 데이터 로드 후 동적으로 추가되는 카드([data-parallax] 포함)도
  // 자동으로 감지해 즉시 진행률을 계산합니다.
  if('MutationObserver' in window){
    new MutationObserver(function(mutations){
      var found = false;
      mutations.forEach(function(m){
        m.addedNodes.forEach(function(node){
          if(node.nodeType !== 1) return;
          if(node.matches && node.matches('[data-parallax]')) found = true;
          if(node.querySelectorAll && node.querySelectorAll('[data-parallax]').length) found = true;
        });
      });
      if(found) onScroll();
    }).observe(document.body, { childList:true, subtree:true });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
