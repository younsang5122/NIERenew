// ============================================================
// 🌿 NIERenew 코어 스크립트: 모바일 내비게이션, 스크롤 리빌, 마우스 스포트라이트
// ============================================================
(function(){
  // 1. 모바일 내비게이션 드로어 토글
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

  // 2. 마우스 포인터 트래킹 스포트라이트 빔
  var cursor = document.getElementById('spotlight-cursor');
  if(!cursor){
    cursor = document.createElement('div');
    cursor.id = 'spotlight-cursor';
    document.body.appendChild(cursor);
  }
  var mouseX = 0, mouseY = 0;
  var cursorX = 0, cursorY = 0;
  window.addEventListener('mousemove', function(e){
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, {passive:true});

  function animateCursor(){
    cursorX += (mouseX - cursorX) * 0.12;
    cursorY += (mouseY - cursorY) * 0.12;
    if(cursor){
      cursor.style.transform = 'translate3d(' + cursorX + 'px, ' + cursorY + 'px, 0)';
    }
    requestAnimationFrame(animateCursor);
  }
  requestAnimationFrame(animateCursor);

  // 3. 스크롤 리빌 애니메이션 (IntersectionObserver)
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, {threshold:0.12, rootMargin:'0px 0px -30px 0px'});
    window.__nieRevealObserver = io;
    document.querySelectorAll('[data-reveal]').forEach(function(el){ io.observe(el); });
  } else {
    document.querySelectorAll('[data-reveal]').forEach(function(el){ el.classList.add('is-visible'); });
  }

  // 4. 더미 앵커 (#) 클릭 시 스크롤 리셋 방지
  document.addEventListener('click', function(e){
    var a = e.target.closest('a[href="#"]');
    if(!a) return;
    e.preventDefault();
  });
})();
