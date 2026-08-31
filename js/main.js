// ============================================================
// 공통 스크립트: 내비게이션 토글, 스크롤 리빌, 생태계 탭
// ============================================================
(function(){
  // 모바일 내비게이션 토글
  var toggle = document.querySelector('.nav-toggle');
  if(toggle){
    toggle.addEventListener('click', function(){
      document.body.classList.toggle('nav-open');
      var expanded = document.body.classList.contains('nav-open');
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
    document.querySelectorAll('.main-nav a').forEach(function(a){
      a.addEventListener('click', function(){ document.body.classList.remove('nav-open'); });
    });
  }

  // 스크롤 리빌 애니메이션 (데이터 기반으로 나중에 추가되는 요소도 관찰할 수 있도록 전역에 노출)
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, {threshold:0.15, rootMargin:'0px 0px -40px 0px'});
    window.__nieRevealObserver = io;
    document.querySelectorAll('[data-reveal]').forEach(function(el){ io.observe(el); });
  } else {
    document.querySelectorAll('[data-reveal]').forEach(function(el){ el.classList.add('is-visible'); });
  }

  // 생태계 탭 전환(생태 탐험 지도 클릭·활성화)은 data.js 의 renderHome() 에서
  // 데이터 로드 이후 동적으로 생성된 탭 요소에 이벤트를 직접 바인딩해 처리합니다.
})();
