// ============================================================
// 예약·신청 시스템 (localStorage 기반)
// "신청하기" / "예약하기" 버튼을 실제로 동작하게 만듭니다.
// 저장된 예약은 reservations.html 에서 확인·취소할 수 있습니다.
// ============================================================
(function(){
  var STORAGE_KEY = 'nie_reservations';

  function loadReservations(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function saveReservations(list){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }catch(e){}
  }
  function addReservation(entry){
    var list = loadReservations();
    entry.id = 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    entry.createdAt = new Date().toISOString();
    list.unshift(entry);
    saveReservations(list);
    updateBadge();
    return entry;
  }
  function removeReservation(id){
    var list = loadReservations().filter(function(r){ return r.id !== id; });
    saveReservations(list);
    updateBadge();
    return list;
  }

  function updateBadge(){
    var count = loadReservations().length;
    document.querySelectorAll('[data-reserve-badge]').forEach(function(el){
      el.textContent = count;
      el.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  // ---------------------------------------------------------
  // 모달 UI (한 번만 생성해 재사용)
  // ---------------------------------------------------------
  var modal, form, titleEl, typeInput, itemInput, feedbackEl;

  function buildModal(){
    if(modal) return;
    modal = document.createElement('div');
    modal.className = 'reserve-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<div class="reserve-modal-backdrop" data-close></div>' +
      '<div class="reserve-modal-panel" role="dialog" aria-modal="true" aria-labelledby="reserve-modal-title">' +
        '<button type="button" class="reserve-modal-close" data-close aria-label="닫기">&times;</button>' +
        '<span class="eyebrow">예약·신청</span>' +
        '<h3 id="reserve-modal-title" class="rm-title">프로그램 예약</h3>' +
        '<form class="reserve-form" novalidate>' +
          '<input type="hidden" name="type">' +
          '<input type="hidden" name="item">' +
          '<label>이름<input type="text" name="name" required placeholder="홍길동" autocomplete="name"></label>' +
          '<label>연락처<input type="tel" name="phone" required placeholder="010-0000-0000" autocomplete="tel"></label>' +
          '<div class="rm-row">' +
            '<label>희망 날짜<input type="date" name="date" required></label>' +
            '<label>인원<input type="number" name="people" min="1" max="20" value="2" required></label>' +
          '</div>' +
          '<label>요청 사항 (선택)<textarea name="note" rows="2" placeholder="유모차 대여, 알레르기 등 참고할 내용을 남겨주세요"></textarea></label>' +
          '<p class="reserve-feedback" role="status" aria-live="polite"></p>' +
          '<div class="rm-actions">' +
            '<button type="button" class="btn btn-ghost" data-close>취소</button>' +
            '<button type="submit" class="btn btn-primary">예약 확정하기</button>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(modal);

    form = modal.querySelector('.reserve-form');
    titleEl = modal.querySelector('.rm-title');
    typeInput = modal.querySelector('input[name="type"]');
    itemInput = modal.querySelector('input[name="item"]');
    feedbackEl = modal.querySelector('.reserve-feedback');

    modal.addEventListener('click', function(e){
      if(e.target.hasAttribute('data-close')) closeModal();
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var fd = new FormData(form);
      var entry = {
        type: fd.get('type') || '프로그램',
        item: fd.get('item') || titleEl.textContent,
        name: fd.get('name'),
        phone: fd.get('phone'),
        date: fd.get('date'),
        people: fd.get('people'),
        note: fd.get('note') || ''
      };
      if(!entry.name || !entry.phone || !entry.date){
        feedbackEl.textContent = '이름·연락처·날짜를 모두 입력해주세요.';
        feedbackEl.classList.add('is-error');
        return;
      }
      addReservation(entry);
      feedbackEl.classList.remove('is-error');
      feedbackEl.classList.add('is-success');
      feedbackEl.textContent = '예약이 저장되었습니다! "생태 자료 > 내 예약" 에서 확인할 수 있어요.';
      form.querySelector('button[type="submit"]').disabled = true;
      setTimeout(function(){ closeModal(); }, 1400);
    });
  }

  function openModal(title, type, item){
    buildModal();
    titleEl.textContent = title || '프로그램 예약';
    typeInput.value = type || '';
    itemInput.value = item || title || '';
    feedbackEl.textContent = '';
    feedbackEl.className = 'reserve-feedback';
    form.reset();
    form.querySelector('input[name="date"]').valueAsDate = null;
    form.querySelector('button[type="submit"]').disabled = false;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function(){ form.querySelector('input[name="name"]').focus(); }, 50);
  }
  function closeModal(){
    if(!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // ---------------------------------------------------------
  // 이벤트 위임: "신청하기" / "예약하기" 문구의 버튼·링크를 자동 감지
  // (데이터 기반으로 나중에 생성된 카드에도 동일하게 적용됨)
  // ---------------------------------------------------------
  function label(el){ return (el.textContent || '').trim(); }

  document.addEventListener('click', function(e){
    var el = e.target.closest('a.btn, button.btn');
    if(!el) return;
    if(el.hasAttribute('data-no-modal')) return; // 실제 페이지 이동이 목적인 링크는 모달을 띄우지 않음
    var text = label(el);
    var isReserveTrigger = /^(신청하기|예약하기)$/.test(text);
    if(!isReserveTrigger) return;

    e.preventDefault();
    var card = el.closest('.card, .info-tile');
    var itemTitle = card ? (card.querySelector('h3, h4') || {}).textContent : text;
    var type = text === '신청하기' ? '교육 프로그램' : '전시 예약';
    openModal(itemTitle ? itemTitle.trim() : text, type, itemTitle ? itemTitle.trim() : text);
  });

  // ---------------------------------------------------------
  // reservations.html 전용: 저장된 예약 렌더링
  // ---------------------------------------------------------
  function renderReservationsPage(){
    var listEl = document.getElementById('reservation-list');
    var emptyEl = document.getElementById('reservation-empty');
    if(!listEl) return;

    function paint(){
      var list = loadReservations();
      if(!list.length){
        listEl.innerHTML = '';
        if(emptyEl) emptyEl.hidden = false;
        return;
      }
      if(emptyEl) emptyEl.hidden = true;
      listEl.innerHTML = list.map(function(r){
        var d = new Date(r.date);
        var dateStr = isNaN(d) ? r.date : (d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0'));
        return (
          '<div class="reservation-item panel">' +
            '<div class="ri-main">' +
              '<span class="data-tag" style="margin-bottom:8px; display:inline-block;">' + escHtml(r.type) + '</span>' +
              '<h4>' + escHtml(r.item) + '</h4>' +
              '<div class="meta-row"><span>👤 ' + escHtml(r.name) + '</span><span>📞 ' + escHtml(r.phone) + '</span>' +
              '<span>🗓 ' + escHtml(dateStr) + '</span><span>👥 ' + escHtml(r.people) + '명</span></div>' +
              (r.note ? '<p style="margin-top:8px; font-size:13px; color:var(--ink-soft);">' + escHtml(r.note) + '</p>' : '') +
            '</div>' +
            '<button type="button" class="btn btn-ghost ri-cancel" data-id="' + r.id + '" data-item="' + escHtml(r.item) + '">예약 취소</button>' +
          '</div>'
        );
      }).join('');
      listEl.querySelectorAll('.ri-cancel').forEach(function(btn){
        btn.addEventListener('click', function(){
          var item = btn.getAttribute('data-item') || '이 예약';
          if(!window.confirm('"' + item + '" 예약을 취소하시겠어요? 이 작업은 되돌릴 수 없습니다.')) return;
          removeReservation(btn.getAttribute('data-id'));
          paint();
        });
      });
    }
    paint();
  }

  function escHtml(str){
    return String(str == null ? '' : str).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    updateBadge();
    if(document.body.getAttribute('data-page') === 'reservations') renderReservationsPage();
  });
})();
