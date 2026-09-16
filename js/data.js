// ============================================================
// 🌿 NIERenew 데이터 & 인터랙티브 기능 통합 모듈
// /data/*.json 로더, 4대 기후관 탭 & 지도, 통합 검색 자동완성,
// 앰비언스 사운드 스피커, 맞춤 관람동선 계산기, 수호 생물 퀴즈
// ============================================================
(function(){
  var DB = { species: [], ecosystems: [], exhibitions: [], education: [], research: [] };

  function byId(list, id){ return list.find(function(x){ return x.id === id; }); }
  function pick(list, ids){ return (ids || []).map(function(id){ return byId(list, id); }).filter(Boolean); }
  function esc(str){
    return String(str == null ? '' : str).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function debounce(func, wait){
    var timeout;
    return function(){
      var context = this, args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function(){ func.apply(context, args); }, wait || 200);
    };
  }

  function fetchJson(url){
    return fetch(url).then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status + ' (' + url + ')');
      return r.json();
    });
  }

  var FALLBACK_DB = {
    species: [
      { id:'otter', name:'수달', scientificName:'Lutra lutra', protectionLevel:'멸종위기 야생생물 I급', category:'포유류', habitat:'강과 하천', image:'assets/img/otter-rock.jpg', ecosystemId:'temperate', description:'유라시아 대륙 전역의 깨끗한 물가에 서식하는 족제비과의 수생 포유류입니다.', exhibitionIds:['climate-ecosystem'], researchIds:['temperature-trend'], facts:{ '먹이':'육식성 (물고기, 개구리 등)', '수명':'10–15년', '체중':'5–14kg' } },
      { id:'desert-fox', name:'사막여우', scientificName:'Vulpes zerda', protectionLevel:'CITES 부속서 II종', category:'포유류', habitat:'사하라 사막·건조지대', image:'assets/img/desert-fox.jpg', ecosystemId:'desert', description:'세계에서 가장 작은 여우 종으로, 열을 배출하는 유난히 큰 귀가 특징입니다.', exhibitionIds:[], researchIds:[], facts:{ '먹이':'잡식성 (전갈, 열매 등)', '수명':'10–12년', '체중':'1–1.5kg' } },
      { id:'chinstrap-penguin', name:'턱끈펭귄', scientificName:'Pygoscelis antarcticus', protectionLevel:'관심대상종', category:'조류', habitat:'남극·아남극 섬', image:'assets/img/polar-penguin.jpg', ecosystemId:'polar', description:'흰 턱 아래로 이어지는 검은 줄무늬가 모자 끈처럼 보이는 남극 대표 펭귄입니다.', exhibitionIds:[], researchIds:[], facts:{ '먹이':'크릴새우, 소형 어류', '수명':'15–20년', '체중':'3–5kg' } },
      { id:'baobab', name:'바오밥나무', scientificName:'Adansonia', protectionLevel:'관심대상종', category:'식물', habitat:'사막·사바나', image:'assets/img/baobab-savanna.jpg', ecosystemId:'desert', description:'아프리카 사바나 건조지대에 자생하는 거대한 거목으로, 줄기에 막대한 수분을 저장합니다.', exhibitionIds:[], researchIds:[], facts:{ '저장 수분량':'최대 12만 리터', '수명':'최대 2,000년 이상' } },
      { id:'tropical-tree', name:'에코리움 열대 수목', scientificName:'Ficus spp.', protectionLevel:'온실 보호종', category:'식물', habitat:'열대 우림', image:'assets/img/tree-glass-ceiling.jpg', ecosystemId:'tropical', description:'에코리움 열대관 웅장한 유리 온실 내부에서 자생하는 열대우림 식물군입니다.', exhibitionIds:['climate-ecosystem'], researchIds:[], facts:{ '생육 환경':'고온다습 (25–30℃)', '전시 위치':'에코리움 열대관' } }
    ],
    ecosystems: [
      { id:'tropical', name:'열대 생태계', description:'가장 다양한 생물종이 어우러져 살아가는 덥고 습한 열대우림 생태계입니다.', image:'assets/img/tropical-hall-visitors.jpg', location:'에코리움 열대관', speciesIds:['tropical-tree'], mapPosition:{x:22, y:58} },
      { id:'desert', name:'사막 생태계', description:'건조하고 메마른 극한의 환경에 적응한 다육식물과 사막 동물을 만납니다.', image:'assets/img/baobab-savanna.jpg', location:'에코리움 사막관', speciesIds:['baobab','desert-fox'], mapPosition:{x:46, y:36} },
      { id:'temperate', name:'온대 생태계', description:'제주 곶자왈과 수달사 등 한반도의 사계절 뚜렷한 대표 온대 생태계입니다.', image:'assets/img/otter-rock.jpg', location:'야외 전시 구역', speciesIds:['otter'], mapPosition:{x:68, y:60} },
      { id:'polar', name:'극지 생태계', description:'얼음과 눈으로 덮인 혹한의 극지방 생태계와 펭귄들의 생생한 삶을 살펴봅니다.', image:'assets/img/polar-penguin.jpg', location:'에코리움 극지관', speciesIds:['chinstrap-penguin'], mapPosition:{x:84, y:32} }
    ],
    exhibitions: [
      { id:'climate-ecosystem', title:'기후변화와 생태계', period:'상설전시', hours:'10:00–17:00', price:'무료 (입장료 별도)', image:'assets/img/ecorium-dome-wide.jpg', description:'기후변화가 한반도 생태계에 미치는 영향을 다양한 인터랙티브 시청각 자료로 체험합니다.' },
      { id:'insect-world', title:'곤충의 신비로운 세계', period:'특별전시', hours:'09:30–18:00', price:'무료 (입장료 별도)', image:'assets/img/insect-exhibit-kids.jpg', description:'희귀 곤충들을 직접 관찰하고 살아있는 생태를 배우는 체험 기획전입니다.' }
    ],
    education: [
      { id:'forest-explorers', title:'숲 속 생태 탐험대', category:'숲 생태', location:'야외 생태 학습장', date:'매주 주말', duration:'120분', target:'어린이', image:'assets/img/forest-family-explore.jpg', description:'어린이 눈높이에 맞춘 야외 숲 생태계 관찰 및 퀴즈 탐험 프로그램입니다.' },
      { id:'family-botanist', title:'우리가족 식물학자', category:'식물', location:'온실 체험관', date:'상시 운영', duration:'90분', target:'가족', image:'assets/img/planting-hands.jpg', description:'가족이 함께 희귀 식물을 관찰하고 직접 화분에 심어보는 체험 프로그램입니다.' }
    ],
    research: [
      { id:'temperature-trend', title:'한반도 기온 변화 추이 (2000–2023)', type:'생태 데이터', description:'지난 20여 년간 한반도의 평균 기온 변화를 기록한 캔버스 데이터 차트입니다.', image:'assets/img/species-data-tablet.jpg', data:[{year:2000,tempAnomaly:0.3},{year:2005,tempAnomaly:0.5},{year:2010,tempAnomaly:0.6},{year:2015,tempAnomaly:0.9},{year:2020,tempAnomaly:1.2},{year:2023,tempAnomaly:1.4}], ecosystemIds:['temperate'], speciesIds:['otter'] },
      { id:'endangered-2023', title:'2023 멸종위기 야생생물 서식 실태 조사', type:'연구자료', description:'전국 주요 습지 및 산림 지역의 멸종위기종 서식 현황을 분석한 종합 보고서입니다.', image:'', data:[], speciesIds:['otter'], ecosystemIds:['temperate'] }
    ]
  };

  function loadAll(){
    return Promise.all([
      fetchJson('data/species.json'),
      fetchJson('data/ecosystems.json'),
      fetchJson('data/exhibitions.json'),
      fetchJson('data/education.json'),
      fetchJson('data/research.json')
    ]).then(function(res){
      DB.species = res[0]; DB.ecosystems = res[1]; DB.exhibitions = res[2];
      DB.education = res[3]; DB.research = res[4];
      return DB;
    }).catch(function(err){
      console.warn('JSON fetch fallback initialized:', err);
      DB.species = FALLBACK_DB.species;
      DB.ecosystems = FALLBACK_DB.ecosystems;
      DB.exhibitions = FALLBACK_DB.exhibitions;
      DB.education = FALLBACK_DB.education;
      DB.research = FALLBACK_DB.research;
      return DB;
    });
  }

  // ---------------------------------------------------------
  // 1. Web Audio API 기반 앰비언스 사운드 스피커 (Soundscape Player)
  // ---------------------------------------------------------
  var audioCtx = null;
  var isAudioPlaying = false;
  var currentEcoSound = 'temperate';
  var noiseNode = null, filterNode = null, gainNode = null;

  function initAmbianceAudio(){
    if(audioCtx) return;
    try {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    } catch(e){ console.warn('Web Audio API not supported'); }
  }

  function startAmbianceSound(ecoId){
    initAmbianceAudio();
    if(!audioCtx) return;
    if(audioCtx.state === 'suspended'){
      audioCtx.resume();
    }
    stopAmbianceSound();

    // 핑크 노이즈 + 필터 기반 자연음 합성
    var bufferSize = audioCtx.sampleRate * 2;
    var noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    var output = noiseBuffer.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.05;
      b6 = white * 0.115926;
    }

    noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    filterNode = audioCtx.createBiquadFilter();
    gainNode = audioCtx.createGain();

    if(ecoId === 'tropical'){
      filterNode.type = 'lowpass';
      filterNode.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
    } else if(ecoId === 'desert'){
      filterNode.type = 'bandpass';
      filterNode.frequency.value = 400;
      filterNode.Q.value = 3.0;
      gainNode.gain.setValueAtTime(0.18, audioCtx.currentTime);
    } else if(ecoId === 'polar'){
      filterNode.type = 'highpass';
      filterNode.frequency.value = 1200;
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    } else { // temperate
      filterNode.type = 'lowpass';
      filterNode.frequency.value = 600;
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    }

    noiseNode.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noiseNode.start();
    isAudioPlaying = true;
    updateAmbianceBtn();
  }

  function stopAmbianceSound(){
    if(noiseNode){
      try{ noiseNode.stop(); noiseNode.disconnect(); }catch(e){}
      noiseNode = null;
    }
    isAudioPlaying = false;
    updateAmbianceBtn();
  }

  function toggleAmbianceSound(){
    if(isAudioPlaying){
      stopAmbianceSound();
    } else {
      startAmbianceSound(currentEcoSound);
    }
  }

  function updateAmbianceBtn(){
    var btn = document.getElementById('ambiance-btn');
    if(!btn) return;
    if(isAudioPlaying){
      btn.classList.add('is-playing');
      btn.setAttribute('aria-label', '앰비언스 사운드 끄기');
      btn.querySelector('.ambiance-label').textContent = '앰비언스 사운드 ON';
    } else {
      btn.classList.remove('is-playing');
      btn.setAttribute('aria-label', '앰비언스 사운드 켜기');
      btn.querySelector('.ambiance-label').textContent = '앰비언스 사운드 OFF';
    }
  }

  // ---------------------------------------------------------
  // 2. 통합 검색 자동완성 인덱서
  // ---------------------------------------------------------
  function setupSearchAutocomplete(){
    var searchInputs = document.querySelectorAll('form[role="search"] input[type="search"], #big-search-input');
    searchInputs.forEach(function(input){
      var form = input.form || input.closest('.big-search') || input.parentElement;
      if(!form) return;

      var dropdown = document.createElement('div');
      dropdown.className = 'search-dropdown';
      dropdown.style.display = 'none';
      form.appendChild(dropdown);

      function updateDropdown(){
        var q = input.value.trim().toLowerCase();
        if(!q || q.length < 1){
          dropdown.style.display = 'none';
          dropdown.innerHTML = '';
          return;
        }

        var results = [];
        DB.species.forEach(function(s){
          if(s.name.toLowerCase().includes(q) || (s.scientificName && s.scientificName.toLowerCase().includes(q))){
            results.push({ type:'생물', title: s.name, sub: s.scientificName, url: 'species.html?id=' + s.id });
          }
        });
        DB.ecosystems.forEach(function(e){
          if(e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)){
            results.push({ type:'생태계', title: e.name, sub: e.location, url: 'index.html#ecosystems' });
          }
        });
        DB.exhibitions.forEach(function(ex){
          if(ex.title.toLowerCase().includes(q) || ex.description.toLowerCase().includes(q)){
            results.push({ type:'전시', title: ex.title, sub: ex.period, url: 'exhibition.html#reserve' });
          }
        });
        DB.education.forEach(function(ed){
          if(ed.title.toLowerCase().includes(q) || ed.description.toLowerCase().includes(q)){
            results.push({ type:'교육', title: ed.title, sub: ed.target, url: 'education.html' });
          }
        });

        if(results.length === 0){
          dropdown.innerHTML = '<div class="search-dropdown-empty">검색 결과가 없습니다. 엔터를 누르면 전체 도감에서 탐색합니다.</div>';
        } else {
          dropdown.innerHTML = results.slice(0, 5).map(function(r){
            return '<a href="' + r.url + '" class="search-dropdown-item">' +
              '<span class="sd-type">' + esc(r.type) + '</span>' +
              '<span class="sd-title">' + esc(r.title) + '</span>' +
              '<span class="sd-sub">' + esc(r.sub || '') + '</span>' +
            '</a>';
          }).join('');
        }
        dropdown.style.display = 'block';
      }

      input.addEventListener('input', debounce(updateDropdown, 180));
      input.addEventListener('focus', updateDropdown);

      document.addEventListener('click', function(e){
        if(!form.contains(e.target)) dropdown.style.display = 'none';
      });
    });
  }

  // ---------------------------------------------------------
  // 3. 홈 페이지 (`index.html`) 렌더링
  // ---------------------------------------------------------
  function renderHome(){
    var tabsContainer = document.getElementById('eco-tabs');
    var panelContainer = document.getElementById('eco-panel');
    var pinsContainer = document.getElementById('map-pins');

    if(!tabsContainer || !panelContainer) return;

    // 앰비언스 사운드 스위치 버튼 추가
    var tabsBar = tabsContainer.closest('.eco-tabs-bar');
    if(!tabsBar){
      tabsBar = document.createElement('div');
      tabsBar.className = 'eco-tabs-bar';
      tabsContainer.parentNode.insertBefore(tabsBar, tabsContainer);
      tabsBar.appendChild(tabsContainer);

      var ambBtn = document.createElement('button');
      ambBtn.id = 'ambiance-btn';
      ambBtn.className = 'ambiance-btn';
      ambBtn.setAttribute('type', 'button');
      ambBtn.setAttribute('aria-label', '앰비언스 사운드 켜기');
      ambBtn.innerHTML = '<span class="sound-wave"><span></span><span></span><span></span></span><span class="ambiance-label">앰비언스 사운드 OFF</span>';
      ambBtn.addEventListener('click', toggleAmbianceSound);
      tabsBar.appendChild(ambBtn);
    }

    var activeEcoId = 'tropical';
    var urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('eco') && byId(DB.ecosystems, urlParams.get('eco'))){
      activeEcoId = urlParams.get('eco');
    }

    tabsContainer.innerHTML = DB.ecosystems.map(function(eco){
      var isActive = eco.id === activeEcoId;
      return '<button class="eco-tab ' + (isActive ? 'is-active' : '') + '" role="tab" aria-selected="' + (isActive ? 'true' : 'false') + '" data-eco-id="' + eco.id + '">' + esc(eco.name) + '</button>';
    }).join('');

    if(pinsContainer){
      pinsContainer.innerHTML = DB.ecosystems.map(function(eco){
        var pos = eco.mapPosition || {x:50, y:50};
        return '<button class="map-pin" style="left:' + pos.x + '%; top:' + pos.y + '%;" data-eco-id="' + eco.id + '" aria-label="' + esc(eco.name) + ' 바로가기">' +
          '<span class="map-pin-label">' + esc(eco.name) + '</span></button>';
      }).join('');
    }

    function switchTab(ecoId){
      activeEcoId = ecoId;
      currentEcoSound = ecoId;
      if(isAudioPlaying) startAmbianceSound(ecoId);

      tabsContainer.querySelectorAll('.eco-tab').forEach(function(btn){
        var matches = btn.getAttribute('data-eco-id') === ecoId;
        btn.classList.toggle('is-active', matches);
        btn.setAttribute('aria-selected', matches ? 'true' : 'false');
      });

      var targetEco = byId(DB.ecosystems, ecoId);
      if(!targetEco) return;

      var speciesList = pick(DB.species, targetEco.speciesIds);
      var featureSp = speciesList[0] || DB.species[0];
      var sideSpecies = speciesList.slice(1, 3);
      if(sideSpecies.length === 0) sideSpecies = DB.species.filter(function(s){ return s.id !== featureSp.id; }).slice(0, 2);

      var html = '<div class="species-grid">' +
        '<div class="card species-feature" data-reveal>' +
          '<div class="card-media"><span class="card-tag">' + esc(targetEco.location) + '</span><img src="' + esc(targetEco.image) + '" alt="' + esc(targetEco.name) + '"></div>' +
          '<div class="card-body"><h3>' + esc(targetEco.name) + '</h3><p>' + esc(targetEco.description) + '</p>' +
          '<div class="link-flow">대표 생물<span class="arrow">→</span><b>' + esc(featureSp.name) + '</b><span class="arrow">→</span><a href="species.html?id=' + esc(featureSp.id) + '" style="color:var(--forest-600); font-weight:700;">상세정보 보기</a></div>' +
          '</div></div>' +
        '<div class="species-side">' +
          sideSpecies.map(function(sp){
            return '<a class="card" href="species.html?id=' + esc(sp.id) + '" data-reveal>' +
              '<div class="card-media"><img src="' + esc(sp.image) + '" alt="' + esc(sp.name) + '"></div>' +
              '<div class="card-body"><h3>' + esc(sp.name) + ' <span class="sci">' + esc(sp.scientificName) + '</span></h3>' +
              '<p>' + esc(sp.protectionLevel) + '</p><span class="card-link">생물 정보 탐색 →</span></div>' +
            '</a>';
          }).join('') +
        '</div>' +
      '</div>';

      panelContainer.innerHTML = html;
      if(window.__nieRevealObserver){
        panelContainer.querySelectorAll('[data-reveal]').forEach(function(el){ window.__nieRevealObserver.observe(el); });
      }
    }

    tabsContainer.addEventListener('click', function(e){
      var btn = e.target.closest('[data-eco-id]');
      if(btn) switchTab(btn.getAttribute('data-eco-id'));
    });
    if(pinsContainer){
      pinsContainer.addEventListener('click', function(e){
        var btn = e.target.closest('[data-eco-id]');
        if(btn){
          var id = btn.getAttribute('data-eco-id');
          switchTab(id);
          var targetEl = document.getElementById('eco-tabs');
          if(targetEl) targetEl.scrollIntoView({behavior:'smooth'});
        }
      });
    }

    switchTab(activeEcoId);
  }

  // ---------------------------------------------------------
  // 4. 생물 발견 페이지 (`species.html`) 렌더링
  // ---------------------------------------------------------
  function renderSpeciesPage(){
    var gridContainer = document.getElementById('species-grid');
    if(!gridContainer && !document.getElementById('sp-title')) return;

    var urlParams = new URLSearchParams(window.location.search);
    var spId = urlParams.get('id');
    var searchQuery = urlParams.get('q');

    if(spId){
      var targetSp = byId(DB.species, spId);
      if(targetSp){
        var titleEl = document.getElementById('sp-title');
        var subDescEl = document.getElementById('sp-sub-desc');
        var descEl = document.getElementById('sp-desc');
        var badgeLevelEl = document.getElementById('sp-badge-level');
        var heroImgEl = document.getElementById('sp-hero-img');
        var factsEl = document.getElementById('sp-facts');

        if(titleEl) titleEl.textContent = targetSp.name;
        if(subDescEl) subDescEl.textContent = targetSp.scientificName || '';
        if(descEl) descEl.textContent = targetSp.description || '';
        if(badgeLevelEl) badgeLevelEl.textContent = targetSp.protectionLevel || '';
        if(heroImgEl) heroImgEl.src = targetSp.image || '';

        if(factsEl && targetSp.facts){
          factsEl.innerHTML = Object.keys(targetSp.facts).map(function(k){
            return '<div class="fact-row"><span>' + esc(k) + '</span><b>' + esc(targetSp.facts[k]) + '</b></div>';
          }).join('');
        }
      }
    }

    if(gridContainer){
      var filterEco = document.getElementById('filter-eco');
      var filterCat = document.getElementById('filter-category');
      var filterLev = document.getElementById('filter-level');

      // 드롭다운 옵션 채우기
      if(filterEco && filterEco.options.length <= 1){
        DB.ecosystems.forEach(function(e){ filterEco.add(new Option(e.name, e.id)); });
      }
      if(filterCat && filterCat.options.length <= 1){
        var cats = Array.from(new Set(DB.species.map(function(s){ return s.category; }))).filter(Boolean);
        cats.forEach(function(c){ filterCat.add(new Option(c, c)); });
      }

      function applyFilters(){
        var ecoVal = filterEco ? filterEco.value : '전체';
        var catVal = filterCat ? filterCat.value : '전체';
        var levVal = filterLev ? filterLev.value : '전체';

        var list = DB.species.filter(function(s){
          if(ecoVal !== '전체' && s.ecosystemId !== ecoVal) return false;
          if(catVal !== '전체' && s.category !== catVal) return false;
          if(levVal !== '전체' && s.protectionLevel !== levVal) return false;
          if(searchQuery && !s.name.includes(searchQuery) && !s.scientificName.includes(searchQuery)) return false;
          return true;
        });

        if(list.length === 0){
          gridContainer.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:40px; color:var(--ink-soft);">조건에 일치하는 생물 정보가 없습니다.</p>';
        } else {
          gridContainer.innerHTML = list.map(function(sp){
            return '<a class="card" href="species.html?id=' + esc(sp.id) + '" data-reveal data-tilt>' +
              '<div class="card-media"><span class="card-tag">' + esc(sp.protectionLevel) + '</span><img src="' + esc(sp.image) + '" alt="' + esc(sp.name) + '"></div>' +
              '<div class="card-body"><h3>' + esc(sp.name) + ' <span class="sci">' + esc(sp.scientificName) + '</span></h3>' +
              '<p>' + esc(sp.habitat) + ' · ' + esc(sp.category) + '</p><span class="card-link">생물 정보 상세 →</span></div>' +
            '</a>';
          }).join('');
        }

        if(window.__nieRevealObserver){
          gridContainer.querySelectorAll('[data-reveal]').forEach(function(el){ window.__nieRevealObserver.observe(el); });
        }
      }

      [filterEco, filterCat, filterLev].forEach(function(sel){
        if(sel) sel.addEventListener('change', applyFilters);
      });
      applyFilters();
    }
  }

  // ---------------------------------------------------------
  // 5. 추천 관람 동선 계산기 모듈 (`exhibition.html` & `index.html`)
  // ---------------------------------------------------------
  function setupRouteCalculator(){
    var calcPanel = document.getElementById('route-calculator');
    if(!calcPanel) return;

    var selTarget = calcPanel.querySelector('[name="calc-target"]');
    var selTime = calcPanel.querySelector('[name="calc-time"]');
    var outputBox = calcPanel.querySelector('.route-calc-output');

    if(!selTarget || !selTime || !outputBox) return;

    function recalculateRoute(){
      var target = selTarget.value; // family, couple, solo, senior
      var time = selTime.value;     // 60, 120, 240

      var dist = '1.2 km', steps = '1,800 보', calories = '85 kcal', duration = '약 60분';
      var routeList = [];

      if(time === '60'){
        duration = '약 60분 (핵심 아카이브 코스)';
        dist = '1.1 km'; steps = '1,650 보'; calories = '75 kcal';
        routeList = [
          { name: '방문자 센터', desc: '티켓 발권 및 종합 안내' },
          { name: '에코리움 (열대/사막관)', desc: '핵심 기후 돔 집중 관람' },
          { name: '하늘다람 놀이터', desc: '야외 휴식 및 기념 촬영' }
        ];
      } else if(time === '120'){
        duration = '약 120분 (추천 여유 코스)';
        dist = '2.4 km'; steps = '3,600 보'; calories = '160 kcal';
        routeList = [
          { name: '방문자 센터', desc: '안내 팜플렛 지참 출발' },
          { name: '에코리움 4대 기후관', desc: '열대·사막·온대·극지 전체 관람' },
          { name: '수달사 & 맹금류사', desc: '야외 온대생태구역 생물관찰' },
          { name: '생태놀이터', desc: '가족 체험 및 산책' }
        ];
      } else { // 240
        duration = '약 240분 (반나절 완벽 심층 탐험)';
        dist = '4.5 km'; steps = '6,800 보'; calories = '310 kcal';
        routeList = [
          { name: '방문자 센터', desc: '오프닝 파크 산책' },
          { name: '에코리움 기후관 & 극지관', desc: '실내 전 관람' },
          { name: '습지생태원 & 용화실못', desc: '야외 습지 탐조' },
          { name: '어린이 생태체험관', desc: '교육 인터랙티브 체험' },
          { name: '식물원 온실', desc: '희귀 식물 관람 후 종선' }
        ];
      }

      var summaryHtml = '<div class="route-calc-summary">' +
        '<span>예상 거리: <b>' + dist + '</b></span>' +
        '<span>예상 걸음: <b>' + steps + '</b></span>' +
        '<span>소비 칼로리: <b>' + calories + '</b></span>' +
        '<span>소요 시간: <b>' + duration + '</b></span>' +
      '</div>';

      var stepsHtml = '<div class="route-steps">' +
        routeList.map(function(s, idx){
          return '<div class="route-step is-active">' +
            '<div class="dot">' + (idx + 1) + '</div>' +
            '<span class="label">' + esc(s.name) + '</span>' +
            '<span class="desc">' + esc(s.desc) + '</span>' +
          '</div>';
        }).join('') +
      '</div>';

      outputBox.innerHTML = summaryHtml + stepsHtml;
    }

    selTarget.addEventListener('change', recalculateRoute);
    selTime.addEventListener('change', recalculateRoute);
    recalculateRoute();
  }

  // ---------------------------------------------------------
  // 6. "나의 생태계 수호 생물 찾기" 인터랙티브 퀴즈 모달
  // ---------------------------------------------------------
  function setupEcoQuiz(){
    var quizBtn = document.getElementById('start-quiz-btn');
    if(!quizBtn) return;

    var questions = [
      { q: '1. 주말에 가장 떠나고 싶은 여행지는 어디인가요?', opts: [{t:'시원한 물가와 강변 산책', s:'otter'}, {t:'뜨거운 햇살 아래 사막 탐험', s:'desert-fox'}, {t:'눈으로 덮인 하얀 얼음 나라', s:'chinstrap-penguin'}, {t:'신비롭고 빽빽한 우림 탐험', s:'baobab'}] },
      { q: '2. 나를 표현하는 가장 어울리는 성격은?', opts: [{t:'호기심 많고 활발함', s:'otter'}, {t:'예민하고 기민하게 관찰함', s:'desert-fox'}, {t:'묵묵히 견디며 주위와 협동함', s:'chinstrap-penguin'}, {t:'느긋하고 아량이 넓음', s:'baobab'}] },
      { q: '3. 위기 상황이 닥쳤을 때 당신의 반응은?', opts: [{t:'재빠르게 헤엄쳐 탈출한다', s:'otter'}, {t:'소리를 들으며 신중히 대처한다', s:'desert-fox'}, {t:'동료들과 뭉쳐 체온을 나눈다', s:'chinstrap-penguin'}, {t:'에너지를 축적하고 묵묵히 참는다', s:'baobab'}] }
    ];

    var currentQ = 0;
    var scoreMap = { 'otter':0, 'desert-fox':0, 'chinstrap-penguin':0, 'baobab':0 };

    quizBtn.addEventListener('click', function(){
      currentQ = 0;
      scoreMap = { 'otter':0, 'desert-fox':0, 'chinstrap-penguin':0, 'baobab':0 };

      var modal = document.createElement('div');
      modal.className = 'reserve-modal is-open';
      modal.innerHTML = '<div class="reserve-modal-backdrop" data-close></div>' +
        '<div class="reserve-modal-panel quiz-modal-panel">' +
          '<button class="reserve-modal-close" data-close>&times;</button>' +
          '<span class="eyebrow">Eco-Quiz Mini Game</span>' +
          '<div id="quiz-content"></div>' +
        '</div>';
      document.body.appendChild(modal);

      var contentEl = modal.querySelector('#quiz-content');

      function renderQuestion(){
        if(currentQ >= questions.length){
          // 결과 계산
          var topSpId = Object.keys(scoreMap).reduce(function(a, b){ return scoreMap[a] > scoreMap[b] ? a : b; });
          var sp = byId(DB.species, topSpId) || DB.species[0];

          contentEl.innerHTML = '<h3 class="quiz-q-title">🎉 당신의 수호 생물이 탄생했습니다!</h3>' +
            '<div class="quiz-result-card">' +
              '<img src="' + esc(sp.image) + '" alt="' + esc(sp.name) + '">' +
              '<h4>' + esc(sp.name) + ' (' + esc(sp.scientificName) + ')</h4>' +
              '<p style="margin-top:8px; font-size:14px; opacity:0.9;">' + esc(sp.description) + '</p>' +
              '<a href="species.html?id=' + esc(sp.id) + '" class="btn btn-amber" style="margin-top:16px;">수호 생물 상세 보기 →</a>' +
            '</div>';
          return;
        }

        var qData = questions[currentQ];
        contentEl.innerHTML = '<h3 class="quiz-q-title">' + esc(qData.q) + '</h3>' +
          '<div class="quiz-options">' +
            qData.opts.map(function(o){
              return '<button type="button" class="quiz-opt-btn" data-sp="' + o.s + '">' + esc(o.t) + '</button>';
            }).join('') +
          '</div>';

        contentEl.querySelectorAll('.quiz-opt-btn').forEach(function(b){
          b.addEventListener('click', function(){
            var sp = b.getAttribute('data-sp');
            scoreMap[sp] = (scoreMap[sp] || 0) + 1;
            currentQ++;
            renderQuestion();
          });
        });
      }

      modal.addEventListener('click', function(e){
        if(e.target.hasAttribute('data-close')){ modal.remove(); }
      });

      renderQuestion();
    });
  }

  // ---------------------------------------------------------
  // 초기화
  // ---------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function(){
    loadAll().then(function(){
      setupSearchAutocomplete();
      renderHome();
      renderSpeciesPage();
      setupRouteCalculator();
      setupEcoQuiz();

      // data.html 차트 버튼 연동
      var chartToggleBtn = document.getElementById('toggle-chart-btn');
      if(chartToggleBtn){
        chartToggleBtn.addEventListener('click', function(){
          var mediaBox = document.getElementById('data-media-box');
          var chartPanel = document.getElementById('data-chart-panel');
          if(mediaBox && chartPanel && window.NIECharts){
            mediaBox.style.display = 'none';
            chartPanel.style.display = 'block';
            var cvs = chartPanel.querySelector('canvas');
            var trend = DB.research.find(function(r){ return r.id === 'temperature-trend'; });
            if(cvs && trend && trend.data){
              window.NIECharts.drawLineChart(cvs, trend.data, { title: trend.title });
            }
          }
        });
      }
    });
  });
})();
