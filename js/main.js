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

  // 스크롤 리빌 애니메이션
  var revealEls = document.querySelectorAll('[data-reveal]');
  if('IntersectionObserver' in window && revealEls.length){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, {threshold:0.15, rootMargin:'0px 0px -40px 0px'});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  // 생태계 탭 전환 (오늘의 생태 / 생태계 선택)
  var tabs = document.querySelectorAll('.eco-tab');
  if(tabs.length){
    var panels = document.querySelectorAll('[data-eco-panel]');
    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        tabs.forEach(function(t){ t.classList.remove('is-active'); t.setAttribute('aria-selected','false'); });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected','true');
        var key = tab.getAttribute('data-eco-tab');
        panels.forEach(function(p){
          p.hidden = p.getAttribute('data-eco-panel') !== key;
        });
      });
    });
  }
})();
