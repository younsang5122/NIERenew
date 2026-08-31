// ============================================================
// 3D 동물 Hover · 클릭 인터랙션
// [data-tilt] 요소에 마우스를 올리면 원근감(perspective) 있게 살짝 기울고,
// 빛이 스치는 글레어 효과가 함께 움직입니다. 클릭 시 살짝 눌리는 펄스로
// "정보 카드가 열린다"는 느낌을 줍니다.
// 카드가 나중에(데이터 로드 후) 추가되어도 자동으로 적용되도록
// MutationObserver로 새 요소를 감지합니다.
// ============================================================
(function(){
  var MAX_TILT = 8; // deg

  function attach(el){
    if(el.__tiltReady) return;
    el.__tiltReady = true;

    var media = el.querySelector('.card-media') || el;
    media.style.transformStyle = 'preserve-3d';
    media.style.willChange = 'transform';
    media.style.transition = 'transform .35s cubic-bezier(.22,1,.36,1)';

    var glare = document.createElement('div');
    glare.className = 'tilt-glare';
    glare.setAttribute('aria-hidden', 'true');
    media.appendChild(glare);

    function reset(){
      media.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)';
      glare.style.opacity = '0';
    }
    reset();

    el.addEventListener('pointerenter', function(e){
      if(e.pointerType === 'touch') return;
      media.style.transition = 'transform .12s ease';
    });

    el.addEventListener('pointermove', function(e){
      if(e.pointerType === 'touch') return;
      var rect = media.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width;   // 0..1
      var py = (e.clientY - rect.top) / rect.height;    // 0..1
      var rotY = (px - 0.5) * MAX_TILT * 2;
      var rotX = (0.5 - py) * MAX_TILT * 2;
      media.style.transform = 'perspective(700px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) scale(1.035)';
      glare.style.opacity = '1';
      glare.style.background = 'radial-gradient(circle at ' + (px*100).toFixed(0) + '% ' + (py*100).toFixed(0) + '%, rgba(255,255,255,.35), transparent 55%)';
    });

    el.addEventListener('pointerleave', function(){
      media.style.transition = 'transform .35s cubic-bezier(.22,1,.36,1)';
      reset();
    });

    el.addEventListener('pointerdown', function(e){
      if(e.pointerType === 'touch') return;
      media.style.transition = 'transform .12s ease';
      media.style.transform += ' scale(0.97)';
    });
    el.addEventListener('pointerup', function(e){
      if(e.pointerType === 'touch') return;
      media.style.transition = 'transform .18s ease';
    });
  }

  function scan(root){
    (root || document).querySelectorAll('[data-tilt]').forEach(attach);
  }

  document.addEventListener('DOMContentLoaded', function(){
    scan();
    if('MutationObserver' in window){
      var mo = new MutationObserver(function(mutations){
        mutations.forEach(function(m){
          m.addedNodes.forEach(function(node){
            if(node.nodeType !== 1) return;
            if(node.matches && node.matches('[data-tilt]')) attach(node);
            if(node.querySelectorAll) scan(node);
          });
        });
      });
      mo.observe(document.body, { childList:true, subtree:true });
    }
  });
})();
