// ============================================================
// 🌿 예약·신청 시스템 (localStorage CRUD + 실시간 뱃지/토스트)
// ============================================================
(function(){
  var STORAGE_KEY = 'nie_reservations';

  function loadReservations(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw){
        // 데모 체험을 위해 기본 데모 예약건 1건 초기화
        var demo = [{
          id: 'r_demo_01',
          type: '전시',
          item: '기후변화와 생태계 상설전시',
          name: '조윤상',
          phone: '010-9500-5300',
          date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
          people: 2,
          note: '주차 공간 및 유모차 동선 문의',
          createdAt: new Date().toISOString()
        }];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
        return demo;
      }
      return JSON.parse(raw);
    }catch(e){ return []; }
  }

  function saveReservations(list){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }catch(e){}
  }

  function addReservation(entry){
    var list = loadReservations();
    entry.id = 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    entry.createdAt = new Date().toISOString();
    list.unshift(entry);
    saveReservations(list);
    updateBadge();
    showToast('✅ ' + entry.item + ' 예약이 완료되었습니다!');
    return entry;
  }

  function removeReservation(id){
    var list = loadReservations().filter(function(r){ return r.id !== id; });
    saveReservations(list);
    updateBadge();
    showToast('🗑️ 예약이 취소되었습니다.');
    return list;
  }

  function updateBadge(){
    var count = loadReservations().length;
    document.querySelectorAll('[data-reserve-badge]').forEach(function(el){
      el.textContent = count;
      el.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  function showToast(msg){
    var toast = document.createElement('div');
    toast.style.cssText = [
      'position:fixed', 'bottom:28px', 'right:28px',
      'background:var(--forest-900)', 'color:#fff', 'padding:14px 24px',
      'border-radius:var(--radius-sm)', 'font-size:14px', 'font-weight:700',
      'box-shadow:var(--shadow-lg)', 'z-index:9999', 'border:1px solid var(--amber)',
      'opacity:0', 'transform:translateY(10px)', 'transition:all 0.3s ease'
    ].join(';');
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function(){
      toast.style.opacity = '1';
      toast.style.transform = 'none';
      setTimeout(function(){
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(function(){ toast.remove(); }, 350);
      }, 3500);
    });
  }

  // ---------------------------------------------------------
  // 예약 모달 UI
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
        '<span class="eyebrow">국립생태원 온라인 예약</span>' +
        '<h3 id="reserve-modal-title" class="rm-title">프로그램 예약</h3>' +
        '<form class="reserve-form" novalidate>' +
          '<input type="hidden" name="type">' +
          '<input type="hidden" name="item">' +
          '<label>예약 대상<input type="text" name="displayItem" readonly style="background:var(--paper-dim); font-weight:700;"></label>' +
          '<label>이름<input type="text" name="name" required placeholder="홍길동" autocomplete="name"></label>' +
          '<label>연락처<input type="tel" name="phone" required placeholder="010-0000-0000" autocomplete="tel"></label>' +
          '<div class="rm-row">' +
            '<label>희망 날짜<input type="date" name="date" required></label>' +
            '<label>인원 (명)<input type="number" name="people" min="1" max="20" value="2" required></label>' +
          '</div>' +
          '<label>요청 사항 (선택)<textarea name="note" rows="2" placeholder="유모차 대여, 휠체어 전용석 등 참고 요청사항"></textarea></label>' +
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

    var dateInput = form.querySelector('input[name="date"]');
    if(dateInput){
      var tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      dateInput.value = tomorrow;
      dateInput.min = tomorrow;
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      feedbackEl.textContent = '';
      feedbackEl.className = 'reserve-feedback';

      var name = form.name.value.trim();
      var phone = form.phone.value.trim();
      var date = form.date.value;
      var people = parseInt(form.people.value, 10) || 1;

      if(!name){
        feedbackEl.textContent = '이름을 입력해주세요.';
        feedbackEl.classList.add('is-error');
        form.name.focus();
        return;
      }
      if(!phone || phone.length < 9){
        feedbackEl.textContent = '올바른 연락처를 입력해주세요.';
        feedbackEl.classList.add('is-error');
        form.phone.focus();
        return;
      }

      addReservation({
        type: typeInput.value || '일반예약',
        item: itemInput.value || '국립생태원 관람',
        name: name,
        phone: phone,
        date: date,
        people: people,
        note: form.note.value.trim()
      });

      closeModal();
      if(window.location.pathname.includes('reservations.html')){
        renderReservationsPage();
      }
    });

    modal.addEventListener('click', function(e){
      if(e.target.hasAttribute('data-close')) closeModal();
    });
  }

  function openModal(type, itemTitle){
    buildModal();
    typeInput.value = type || '예약';
    itemInput.value = itemTitle || '국립생태원 관람';
    form.displayItem.value = itemTitle || '국립생태원 대표 관람';
    titleEl.textContent = itemTitle + ' 예약';
    feedbackEl.textContent = '';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(){
    if(!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  // ---------------------------------------------------------
  // 내 예약 페이지 (`reservations.html`) 렌더링
  // ---------------------------------------------------------
  function renderReservationsPage(){
    var listContainer = document.getElementById('reservations-list');
    if(!listContainer) return;

    var list = loadReservations();
    if(list.length === 0){
      listContainer.innerHTML = '<div class="reservation-empty">' +
        '<h3>예약 내역이 없습니다</h3>' +
        '<p style="margin-top:6px;">전시 또는 교육 프로그램 페이지에서 원하는 항목을 예약해보세요.</p>' +
        '<a href="exhibition.html" class="btn btn-primary" style="margin-top:18px;">전시 프로그램 둘러보기 →</a>' +
      '</div>';
      return;
    }

    listContainer.innerHTML = list.map(function(r){
      return '<div class="reservation-item">' +
        '<div>' +
          '<span class="eyebrow">' + esc(r.type) + '</span>' +
          '<h4>' + esc(r.item) + '</h4>' +
          '<div class="ri-meta">' +
            '<span><b>예약자:</b> ' + esc(r.name) + ' (' + esc(r.phone) + ')</span>' +
            '<span><b>방문일:</b> ' + esc(r.date) + '</span>' +
            '<span><b>인원:</b> ' + esc(r.people) + '명</span>' +
          '</div>' +
          (r.note ? '<p style="margin-top:10px; font-size:13px; color:var(--ink-soft); background:var(--paper); padding:8px 12px; border-radius:4px;">요청사항: ' + esc(r.note) + '</p>' : '') +
        '</div>' +
        '<button type="button" class="btn btn-ghost ri-cancel" data-cancel-id="' + r.id + '">예약 취소</button>' +
      '</div>';
    }).join('');

    listContainer.querySelectorAll('[data-cancel-id]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-cancel-id');
        if(confirm('정말 이 예약을 취소하시겠습니까?')){
          removeReservation(id);
          renderReservationsPage();
        }
      });
    });
  }

  // ---------------------------------------------------------
  // 이벤트 바인딩
  // ---------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function(){
    updateBadge();
    renderReservationsPage();

    document.addEventListener('click', function(e){
      var btn = e.target.closest('[data-reserve-item], .btn-reserve');
      if(btn && !btn.hasAttribute('data-no-modal')){
        e.preventDefault();
        var item = btn.getAttribute('data-reserve-item') || btn.closest('.card, .info-tile, .research-item, section')?.querySelector('h2, h3, h4')?.textContent || '전시/교육 프로그램';
        var type = btn.getAttribute('data-reserve-type') || '예약';
        openModal(type, item);
      }
    });
  });

  window.NIEReserve = { openModal: openModal, loadReservations: loadReservations };
})();
