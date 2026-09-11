// ============================================================
// 데이터 레이어: /data/*.json 을 불러와 각 페이지를 렌더링하고
// 통합 검색(자동완성)을 구동합니다.
// ⚠️ file:// 로 직접 열면 fetch가 브라우저 보안 정책에 막힐 수 있습니다.
//    로컬 서버(예: python -m http.server)로 열어주세요.
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
  function nl2br(str){ return esc(str).replace(/\n/g, '<br>'); }
  function debounce(func, wait){
    var timeout;
    return function(){
      var context = this, args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function(){ func.apply(context, args); }, wait || 250);
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
      { id:'otter', name:'수달', scientificName:'Lutra lutra', protectionLevel:'멸종위기 야생생물 I급', category:'포유류', habitat:'강과 하천', image:'assets/img/otter-rock.jpg', ecosystemId:'temperate', description:'유라시아 대륙 전역의 깨끗한 물가에 서식하는 족제비과의 포유류입니다.', exhibitionIds:['climate-ecosystem'], researchIds:['temperature-trend'], facts:{ '먹이':'육식성 (물고기, 개구리 등)', '수명':'10–15년', '무게':'5–14kg' } },
      { id:'desert-fox', name:'사막여우', scientificName:'Vulpes zerda', protectionLevel:'CITES 부속서 II종', category:'포유류', habitat:'사하라 사막·건조지대', image:'assets/img/desert-fox.jpg', ecosystemId:'desert', description:'세계에서 가장 작은 여우 종으로, 몸집에 비해 유난히 큰 귀가 특징입니다.', exhibitionIds:[], researchIds:[], facts:{ '먹이':'잡식성', '수명':'10–12년', '무게':'1–1.5kg' } },
      { id:'chinstrap-penguin', name:'턱끈펭귄', scientificName:'Pygoscelis antarcticus', protectionLevel:'관심대상종', category:'조류', habitat:'남극·아남극 섬', image:'assets/img/polar-penguin.jpg', ecosystemId:'polar', description:'흰 턱 아래로 이어지는 검은 줄무늬가 특징인 남극의 펭귄입니다.', exhibitionIds:[], researchIds:[], facts:{ '먹이':'크릴, 작은 물고기', '수명':'15–20년', '무게':'3–5kg' } },
      { id:'baobab', name:'바오밥나무', scientificName:'Adansonia', protectionLevel:'관심대상종', category:'식물', habitat:'사막·사바나', image:'assets/img/baobab-savanna.jpg', ecosystemId:'desert', description:'아프리카 사바나에 자생하는 거대한 낙엽수로, 굵은 줄기에 물을 저장합니다.', exhibitionIds:[], researchIds:[], facts:{ '저장 수분':'최대 12만 리터', '수명':'최대 2,000년 이상' } },
      { id:'tropical-tree', name:'에코리움 열대 수목', scientificName:'Ficus spp.', protectionLevel:'온실 보호종', category:'식물', habitat:'열대 우림', image:'assets/img/tree-glass-ceiling.jpg', ecosystemId:'tropical', description:'에코리움 열대관 유리 온실 안에서 자생하는 열대 수목 컬렉션입니다.', exhibitionIds:['climate-ecosystem'], researchIds:[], facts:{ '생육 환경':'고온다습 (25–30℃)', '전시 위치':'에코리움 열대관' } }
    ],
    ecosystems: [
      { id:'tropical', name:'열대 생태계', description:'가장 다양한 생물종이 살아가는 덥고 습한 열대우림 생태계입니다.', image:'assets/img/tropical-hall-visitors.jpg', location:'에코리움 열대관', speciesIds:['tropical-tree'], mapPosition:{x:22, y:58} },
      { id:'desert', name:'사막 생태계', description:'건조하고 메마른 환경에 적응한 다육식물과 건조 동물들을 만납니다.', image:'assets/img/baobab-savanna.jpg', location:'에코리움 사막관', speciesIds:['baobab','desert-fox'], mapPosition:{x:46, y:36} },
      { id:'temperate', name:'온대 생태계', description:'제주 곶자왈, 수달사와 맹금류사 등 한반도의 사계절 뚜렷한 온대 생태계입니다.', image:'assets/img/otter-rock.jpg', location:'야외 전시 구역', speciesIds:['otter'], mapPosition:{x:68, y:60} },
      { id:'polar', name:'극지 생태계', description:'얼음과 눈으로 덮인 극지방 생태계와 펭귄들의 삶을 살펴봅니다.', image:'assets/img/polar-penguin.jpg', location:'에코리움 극지관', speciesIds:['chinstrap-penguin'], mapPosition:{x:84, y:32} }
    ],
    exhibitions: [
      { id:'climate-ecosystem', title:'기후변화와 생태계', period:'상설전시', hours:'10:00–17:00', price:'무료 (입장료 별도)', image:'assets/img/ecorium-dome-wide.jpg', description:'기후변화가 한반도 생태계에 미치는 영향을 다양한 시청각 자료로 체험합니다.', recommendedRoute:['방문자 센터','에코리움(열대/사막관)','하늘다람 놀이터','서문 출구'] },
      { id:'insect-world', title:'곤충의 신비로운 세계', period:'특별전시', hours:'09:30–18:00', price:'무료 (입장료 별도)', image:'assets/img/insect-exhibit-kids.jpg', description:'희귀 곤충들을 만나고 그들의 독특한 생존 방식을 배우는 특별 기획전입니다.', recommendedRoute:['방문자 센터','어린이생태체험관','야외 곤충정원'] }
    ],
    education: [
      { id:'forest-explorers', title:'숲 속 생태 탐험대', category:'숲 생태', location:'야외 생태 학습장', date:'매주 주말', duration:'120분', target:'어린이', image:'assets/img/forest-family-explore.jpg', description:'어린이 눈높이에 맞춘 숲 생태계 관찰 프로그램입니다.' },
      { id:'family-botanist', title:'우리가족 식물학자', category:'식물', location:'온실 체험관', date:'상시 운영', duration:'90분', target:'가족', image:'assets/img/planting-hands.jpg', description:'가족이 함께 식물을 관찰하고 직접 화분에 심어보는 체험입니다.' }
    ],
    research: [
      { id:'temperature-trend', title:'한반도 기온 변화 추이 (2000–2023)', type:'생태 데이터', description:'지난 20여 년간 한반도의 평균 기온 변화를 나타내는 데이터입니다.', image:'assets/img/species-data-tablet.jpg', data:[{year:2000,tempAnomaly:0.3},{year:2005,tempAnomaly:0.5},{year:2010,tempAnomaly:0.6},{year:2015,tempAnomaly:0.9},{year:2020,tempAnomaly:1.2},{year:2023,tempAnomaly:1.4}], ecosystemIds:['temperate'], speciesIds:['otter'] },
      { id:'endangered-2023', title:'2023 멸종위기 야생생물 서식 실태 조사', type:'연구자료', description:'전국 주요 습지 및 산림 지역의 멸종위기종 서식 현황을 분석한 보고서입니다.', image:'', data:[], speciesIds:['otter'], ecosystemIds:['temperate'] },
      { id:'climate-tropical-plants', title:'기후변화와 열대식물', type:'연구 보고서', description:'국립생태원 연구진이 발행한 최신 모니터링 보고서 전문입니다.', image:'assets/img/baobab-savanna.jpg', data:[], speciesIds:['baobab'], ecosystemIds:['desert','tropical'] },
      { id:'otter-survey-2024', title:'2024 수달 서식 실태 조사', type:'현장 데이터', description:'수달의 최신 행동 패턴 및 유전적 다양성을 현장 조사로 기록한 연구 자료입니다.', image:'assets/img/species-data-tablet.jpg', data:[], speciesIds:['otter'], ecosystemIds:['temperate'] }
    ]
  };

  // 로컬(file://) 환경에서 fetch 실패 시 보여주는 토스트 알림 (대형 붉은 배너 대신)
  function showFallbackToast(){
    var toast = document.createElement('div');
    toast.style.cssText = [
      'position:fixed','bottom:24px','left:50%','transform:translateX(-50%)',
      'background:rgba(21,33,26,0.92)','color:#d7e2cf','padding:11px 22px',
      'border-radius:8px','font-size:13px','z-index:9999',
      'box-shadow:0 8px 24px rgba(0,0,0,.3)','pointer-events:none',
      'opacity:0','transition:opacity .4s ease','white-space:nowrap'
    ].join(';');
    toast.innerHTML = '📦 <strong>로컬 데모 데이터</strong>로 작동 중입니다. 로컬 서버(<code>npx serve</code>)에서 전체 기능을 이용할 수 있습니다.';
    document.body.appendChild(toast);
    requestAnimationFrame(function(){
      toast.style.opacity = '1';
      setTimeout(function(){
        toast.style.opacity = '0';
        setTimeout(function(){ toast.remove(); }, 450);
      }, 4500);
    });
  }

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
      console.warn('Network fetch 실패, 기본 데이터셋으로 자동 폴백합니다:', err);
      DB.species = FALLBACK_DB.species;
      DB.ecosystems = FALLBACK_DB.ecosystems;
      DB.exhibitions = FALLBACK_DB.exhibitions;
      DB.education = FALLBACK_DB.education;
      DB.research = FALLBACK_DB.research;
      showFallbackToast();
      return DB;
    });
  }

  // ---------------------------------------------------------
  // 카드 템플릿
  // ---------------------------------------------------------
  function speciesCard(sp){
    return (
      '<a class="card" href="species.html?id=' + esc(sp.id) + '" data-reveal>' +
        '<div class="card-media"><span class="card-tag">' + esc(sp.protectionLevel) + '</span>' +
        '<img src="' + esc(sp.image) + '" alt="' + esc(sp.name) + '"></div>' +
        '<div class="card-body"><h3>' + esc(sp.name) + ' <span class="sci">' + esc(sp.scientificName) + '</span></h3>' +
        '<p>' + esc(sp.habitat) + ' · ' + esc(sp.category) + '</p>' +
        '<span class="card-link">생물 상세 보기 →</span></div>' +
      '</a>'
    );
  }

  function ecosystemFeatureBlock(eco){
    var speciesList = pick(DB.species, eco.speciesIds);
    var feature = (
      '<div class="card species-feature" data-reveal data-parallax>' +
        '<div class="card-media">' +
        '<img src="' + esc(eco.image) + '" alt="' + esc(eco.name) + '"></div>' +
        '<div class="card-body"><h3>' + esc(eco.name) + '</h3><p>' + esc(eco.description) + '</p>' +
        '<div class="link-flow">생태계<span class="arrow">→</span><b>' +
        esc(speciesList[0] ? speciesList[0].name : eco.location) + '</b><span class="arrow">→</span>전시·교육·연구</div>' +
        '</div></div>'
    );
    var side = speciesList.slice(0, 2).map(function(sp){
      return (
        '<a class="card" href="species.html?id=' + esc(sp.id) + '" data-reveal data-parallax>' +
          '<div class="card-media"><img src="' + esc(sp.image) + '" alt="' + esc(sp.name) + '"></div>' +
          '<div class="card-body"><h3>' + esc(sp.name) + ' <span class="sci">' + esc(sp.scientificName) + '</span></h3>' +
          '<p>' + esc(sp.protectionLevel) + '</p><span class="card-link">생물 상세 보기 →</span></div>' +
        '</a>'
      );
    }).join('');
    if(!side){
      side = '<div class="card" data-reveal data-parallax><div class="card-body"><h3>준비 중인 콘텐츠</h3><p>' + esc(eco.name) + '의 생물 정보를 곧 만나보실 수 있어요.</p></div></div>';
    }
    return (
      '<div class="species-grid">' + feature +
      '<div class="species-side">' + side + '</div></div>'
    );
  }

  // ---------------------------------------------------------
  // 홈(생태 탐험): 기후대 탭 + 인터랙티브 지도
  // ---------------------------------------------------------
  function renderHome(){
    var tabsEl = document.getElementById('eco-tabs');
    var panelEl = document.getElementById('eco-panel');
    if(!tabsEl || !panelEl) return;

    tabsEl.innerHTML = DB.ecosystems.map(function(eco, i){
      return '<button class="eco-tab' + (i === 0 ? ' is-active' : '') + '" role="tab" ' +
        'id="eco-tab-' + esc(eco.id) + '" aria-controls="eco-panel" ' +
        'aria-selected="' + (i === 0 ? 'true' : 'false') + '" data-eco-tab="' + esc(eco.id) + '">' + esc(eco.name) + '</button>';
    }).join('');

    function paint(ecoId){
      var eco = byId(DB.ecosystems, ecoId) || DB.ecosystems[0];
      panelEl.innerHTML = ecosystemFeatureBlock(eco);
      panelEl.setAttribute('aria-labelledby', 'eco-tab-' + eco.id);
      revealNow(panelEl);
    }
    tabsEl.addEventListener('click', function(e){
      var btn = e.target.closest('.eco-tab');
      if(!btn) return;
      tabsEl.querySelectorAll('.eco-tab').forEach(function(t){ t.classList.remove('is-active'); t.setAttribute('aria-selected','false'); });
      btn.classList.add('is-active'); btn.setAttribute('aria-selected','true');
      paint(btn.getAttribute('data-eco-tab'));
      setupMapPins();
    });

    // WAI-ARIA 키보드 내비게이션: 화살표 키로 탭 이동
    tabsEl.addEventListener('keydown', function(e){
      var tabs = Array.prototype.slice.call(tabsEl.querySelectorAll('.eco-tab'));
      var idx = tabs.indexOf(document.activeElement);
      if(idx === -1) return;
      var next = idx;
      if(e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % tabs.length;
      else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + tabs.length) % tabs.length;
      else if(e.key === 'Home') next = 0;
      else if(e.key === 'End') next = tabs.length - 1;
      else return;
      e.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    });
    var reqEco = new URLSearchParams(location.search).get('eco');
    var initialEco = byId(DB.ecosystems, reqEco) ? reqEco : DB.ecosystems[0].id;
    tabsEl.querySelectorAll('.eco-tab').forEach(function(t){
      var active = t.getAttribute('data-eco-tab') === initialEco;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    paint(initialEco);

    // 연계 프로그램 및 연구 (동적)
    var linkEl = document.getElementById('linked-programs');
    if(linkEl){
      var picks = [DB.exhibitions[0], DB.education[0], DB.research[DB.research.length - 1]].filter(Boolean);
      linkEl.innerHTML = picks.map(function(item){
        var isExh = !!item.title && !!item.period;
        var isEdu = !!item.title && !!item.target;
        var href = isExh ? 'exhibition.html' : (isEdu ? 'education.html' : 'data.html');
        var tag = isExh ? (item.period) : (isEdu ? item.category : item.type);
        var img = item.image || 'assets/img/ecorium-dome-wide.jpg';
        var cta = isExh ? '자세히 보기' : (isEdu ? '신청하기' : '보고서 읽기');
        return (
          '<a href="' + href + '" class="card" data-reveal data-parallax>' +
            '<div class="card-media"><span class="card-tag">' + esc(tag) + '</span><img src="' + esc(img) + '" alt="' + esc(item.title) + '"></div>' +
            '<div class="card-body"><h3>' + esc(item.title) + '</h3><p>' + esc(item.description) + '</p>' +
            '<span class="card-link">' + cta + ' →</span></div>' +
          '</a>'
        );
      }).join('');
      revealNow(linkEl);
    }

    setupMapPins();
  }

  function setupMapPins(){
    var pinLayer = document.getElementById('map-pins');
    if(!pinLayer) return;
    pinLayer.innerHTML = DB.ecosystems.map(function(eco){
      return '<button type="button" class="map-pin" data-eco-id="' + esc(eco.id) + '" ' +
        'style="left:' + eco.mapPosition.x + '%; top:' + eco.mapPosition.y + '%;" ' +
        'aria-label="' + esc(eco.name) + ' 보기">' +
        '<span class="map-pin-label">' + esc(eco.name) + '<\/span>' +
        '<\/button>';
    }).join('');
    pinLayer.querySelectorAll('.map-pin').forEach(function(pin){
      pin.addEventListener('click', function(){
        var ecoId = pin.getAttribute('data-eco-id');
        var tab = document.querySelector('.eco-tab[data-eco-tab="' + ecoId + '"]');
        if(tab){
          tab.click();
          tab.scrollIntoView({behavior:'smooth', block:'center'});
        } else {
          // 이 페이지엔 탭이 없는 경우(예: 전시·관람 페이지) 생태 탐험 페이지로 이동
          window.location.href = 'index.html?eco=' + encodeURIComponent(ecoId) + '#ecosystems';
        }
      });
    });
  }

  // ---------------------------------------------------------
  // 생물 발견 페이지
  // ---------------------------------------------------------
  function renderSpeciesDetail(sp){
    var heroImg = document.getElementById('sp-hero-img');
    var badgeLevel = document.getElementById('sp-badge-level');
    var titleEl = document.getElementById('sp-title');
    var subDescEl = document.getElementById('sp-sub-desc');
    var descEl = document.getElementById('sp-desc');
    var flowEl = document.getElementById('sp-flow');
    var factsEl = document.getElementById('sp-facts');
    var ctaEl = document.getElementById('sp-cta');
    if(!titleEl) return;

    document.title = sp.name + ' | 생물 발견 | 국립생태원';

    if(heroImg){
      heroImg.src = sp.image;
      heroImg.alt = sp.name;
    }

    if(badgeLevel) badgeLevel.textContent = sp.protectionLevel;

    if(titleEl) titleEl.textContent = sp.name;
    if(subDescEl) subDescEl.textContent = sp.scientificName;
    if(descEl) descEl.innerHTML = sp.description.split('\n').map(function(p){ return '<p class="desc">' + nl2br(p) + '</p>'; }).join('');

    var eco = byId(DB.ecosystems, sp.ecosystemId);
    var exList = pick(DB.exhibitions, sp.exhibitionIds);
    var reList = pick(DB.research, sp.researchIds);
    if(flowEl){
      var chain = ['생물'];
      if(eco) chain.push(eco.name);
      exList.forEach(function(e){ chain.push(e.title); });
      reList.forEach(function(r){ chain.push(r.title); });
      flowEl.innerHTML = chain.map(function(c,i){
        return (i===0 ? '' : '<span class="arrow">→</span>') + (i===0 ? c : '<b>'+esc(c)+'</b>');
      }).join('');
    }
    if(factsEl){
      var rows = Object.keys(sp.facts || {}).map(function(k){
        return '<div class="fact-row"><span>' + esc(k) + '</span><b>' + esc(sp.facts[k]) + '</b></div>';
      }).join('');
      factsEl.innerHTML = rows + '<div class="fact-row"><span>보호등급</span><b>' + esc(sp.protectionLevel) + '</b></div>';
    }
    if(ctaEl && eco){
      ctaEl.href = 'index.html#ecosystems';
      ctaEl.textContent = eco.name + ' 탐험하기 →';
    }
  }

  function renderSpeciesPage(){
    var params = new URLSearchParams(location.search);
    var reqId = params.get('id');
    var reqQ = (params.get('q') || '').trim();
    var sp = byId(DB.species, reqId) || DB.species[0];
    renderSpeciesDetail(sp);

    var gridEl = document.getElementById('species-grid');
    var noticeEl = document.getElementById('species-search-notice');
    var ecoFilter = document.getElementById('filter-eco');
    var catFilter = document.getElementById('filter-category');
    var levelFilter = document.getElementById('filter-level');
    if(!gridEl) return;

    // 필터 옵션 채우기
    if(ecoFilter){
      ecoFilter.innerHTML = '<option value="">전체</option>' + DB.ecosystems.map(function(e){
        return '<option value="' + esc(e.id) + '">' + esc(e.name) + '</option>';
      }).join('');
    }
    if(catFilter){
      var cats = Array.from(new Set(DB.species.map(function(s){ return s.category; })));
      catFilter.innerHTML = '<option value="">전체</option>' + cats.map(function(c){ return '<option value="'+esc(c)+'">'+esc(c)+'</option>'; }).join('');
    }
    if(levelFilter){
      var levels = Array.from(new Set(DB.species.map(function(s){ return s.protectionLevel; })));
      levelFilter.innerHTML = '<option value="">전체</option>' + levels.map(function(l){ return '<option value="'+esc(l)+'">'+esc(l)+'</option>'; }).join('');
    }

    function paint(){
      var eco = ecoFilter ? ecoFilter.value : '';
      var cat = catFilter ? catFilter.value : '';
      var lvl = levelFilter ? levelFilter.value : '';
      // 다중 키워드: 공백으로 분리한 토큰 중 하나라도 매칭되면 결과 포함
      var tokens = reqQ.toLowerCase().split(/\s+/).filter(Boolean);
      var list = DB.species.filter(function(s){
        var matchesQ = !tokens.length || tokens.some(function(t){
          return s.name.toLowerCase().indexOf(t) !== -1 ||
            s.scientificName.toLowerCase().indexOf(t) !== -1 ||
            s.habitat.toLowerCase().indexOf(t) !== -1 ||
            s.category.toLowerCase().indexOf(t) !== -1;
        });
        return matchesQ && (!eco || s.ecosystemId === eco) && (!cat || s.category === cat) && (!lvl || s.protectionLevel === lvl);
      });
      if(noticeEl){
        if(reqQ){
          noticeEl.hidden = false;
          noticeEl.textContent = '"' + reqQ + '" 검색 결과 ' + list.length + '건';
        } else {
          noticeEl.hidden = true;
        }
      }
      gridEl.innerHTML = list.length ? list.map(speciesCard).join('') :
        '<p style="color:var(--ink-soft); grid-column:1/-1;">' +
        (reqQ ? '"' + esc(reqQ) + '"에 대한 검색 결과가 없습니다. 다른 검색어를 시도해보세요.' : '조건에 맞는 생물이 없습니다.') +
        '</p>';
      revealNow(gridEl);
    }
    [ecoFilter, catFilter, levelFilter].forEach(function(el){
      if(el) el.addEventListener('change', paint);
    });
    paint();
  }

  // ---------------------------------------------------------
  // 전시·관람 페이지
  // ---------------------------------------------------------
  function exhibitionCard(ex){
    return (
      '<div class="card" data-reveal>' +
        '<div class="card-media"><span class="card-tag">' + esc(ex.period) + '</span>' +
        '<img src="' + esc(ex.image) + '" alt="' + esc(ex.title) + '"></div>' +
        '<div class="card-body"><h3>' + esc(ex.title) + '</h3><p>' + esc(ex.description) + '</p>' +
        '<div class="meta-row"><span>⏰ ' + esc(ex.hours) + '</span><span>🎫 ' + esc(ex.price) + '</span></div>' +
        '<a href="#reserve" class="btn ' + (ex.period === '상설전시' ? 'btn-primary' : 'btn-ghost') + '" style="margin-top:16px; width:100%;">예약하기</a></div>' +
      '</div>'
    );
  }

  function renderExhibitionPage(){
    var gridEl = document.getElementById('exhibition-grid');
    if(gridEl){
      gridEl.innerHTML = DB.exhibitions.map(exhibitionCard).join('');
      revealNow(gridEl);
    }
    var routeEl = document.getElementById('route-steps');
    if(routeEl){
      var main = byId(DB.exhibitions, 'climate-ecosystem') || DB.exhibitions[0];
      routeEl.innerHTML = main.recommendedRoute.map(function(step, i){
        return '<div class="route-step' + (i < 2 ? ' is-active' : '') + '"><span class="dot">' + (i+1) + '</span><span class="label">' + esc(step) + '</span></div>';
      }).join('');
    }
    setupMapPins();
  }

  // ---------------------------------------------------------
  // 교육·연구 페이지
  // ---------------------------------------------------------
  function educationCard(ed){
    return (
      '<div class="card" data-reveal>' +
        '<div class="card-media"><span class="card-tag">' + esc(ed.category) + '</span>' +
        '<img src="' + esc(ed.image) + '" alt="' + esc(ed.title) + '"></div>' +
        '<div class="card-body"><h3>' + esc(ed.title) + '</h3><p>' + esc(ed.description) + '</p>' +
        '<div class="meta-row"><span>📍 ' + esc(ed.location) + '</span><span>🗓 ' + esc(ed.date) + '</span><span>⏱ ' + esc(ed.duration) + '</span></div>' +
        '<a href="#" class="btn btn-primary" style="margin-top:16px; width:100%;">신청하기</a></div>' +
      '</div>'
    );
  }

  function renderEducationPage(){
    var gridEl = document.getElementById('education-grid');
    var targetFilter = document.getElementById('filter-target');
    var topicFilter = document.getElementById('filter-topic');
    if(!gridEl) return;

    if(targetFilter){
      var targets = Array.from(new Set(DB.education.map(function(e){ return e.target; })));
      targetFilter.innerHTML = '<option value="">전체</option>' + targets.map(function(t){ return '<option value="'+esc(t)+'">'+esc(t)+'</option>'; }).join('');
    }
    if(topicFilter){
      var topics = Array.from(new Set(DB.education.map(function(e){ return e.category; })));
      topicFilter.innerHTML = '<option value="">전체</option>' + topics.map(function(t){ return '<option value="'+esc(t)+'">'+esc(t)+'</option>'; }).join('');
    }
    function paint(){
      var t = targetFilter ? targetFilter.value : '';
      var c = topicFilter ? topicFilter.value : '';
      var list = DB.education.filter(function(e){ return (!t || e.target === t) && (!c || e.category === c); });
      gridEl.innerHTML = list.length ? list.map(educationCard).join('') :
        '<p style="color:var(--ink-soft); grid-column:1/-1;">조건에 맞는 프로그램이 없습니다.</p>';
      revealNow(gridEl);
    }
    [targetFilter, topicFilter].forEach(function(el){ if(el) el.addEventListener('change', paint); });
    paint();

    var dataPanelDesc = document.getElementById('research-data-desc');
    var research = byId(DB.research, 'temperature-trend');
    if(dataPanelDesc && research){
      dataPanelDesc.textContent = research.description;
    }
    setupChartToggle(research);
    var researchList = document.getElementById('research-mini-list');
    if(researchList){
      var others = DB.research.filter(function(r){ return r.id !== 'temperature-trend'; }).slice(0,2);
      researchList.innerHTML = others.map(function(r){
        return '<div class="research-item panel" data-reveal><span class="r-icon" aria-hidden="true">' + docIcon() + '</span>' +
          '<div><h4>' + esc(r.title) + '</h4><p>' + esc(r.description) + '</p></div></div>';
      }).join('');
      revealNow(researchList);
    }
  }

  function docIcon(){
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>';
  }

  function setupChartToggle(research){
    var overlay = document.getElementById('data-overlay-toggle');
    var panel = document.getElementById('chart-panel');
    var back = document.getElementById('chart-back');
    var canvas = document.getElementById('temp-chart');
    if(!overlay || !panel || !canvas || !research || !research.data || !research.data.length) return;

    var drawn = false;
    function showChart(){
      overlay.hidden = true;
      panel.hidden = false;
      if(!drawn && window.NIECharts){
        window.NIECharts.drawLineChart(canvas, research.data, { title: '한반도 기온 이상 편차 (℃, 기준연도 대비)' });
        drawn = true;
        window.addEventListener('resize', function(){
          window.NIECharts.drawLineChart(canvas, research.data, { title: '한반도 기온 이상 편차 (℃, 기준연도 대비)' });
        });
      }
    }
    overlay.addEventListener('click', showChart);
    if(back){
      back.addEventListener('click', function(){
        panel.hidden = true;
        overlay.hidden = false;
      });
    }
  }

  // ---------------------------------------------------------
  // 생태 자료(연구) 페이지 + 통합 검색
  // ---------------------------------------------------------
  function researchItemHTML(r){
    var linkedSpecies = pick(DB.species, r.speciesIds)[0];
    var linkedEco = pick(DB.ecosystems, r.ecosystemIds)[0];
    var href = linkedSpecies ? 'species.html?id=' + encodeURIComponent(linkedSpecies.id) :
      (linkedEco ? 'index.html?eco=' + encodeURIComponent(linkedEco.id) + '#ecosystems' : '');
    var tag = href ? 'a' : 'div';
    var hrefAttr = href ? ' href="' + esc(href) + '"' : '';
    return '<' + tag + ' class="research-item"' + hrefAttr + '><span class="r-icon" aria-hidden="true">' + docIcon() + '</span>' +
      '<div><h4>' + esc(r.title) + '</h4><p>' + esc(r.description) + '</p></div></' + tag + '>';
  }

  function renderDataPage(){
    var listEl = document.getElementById('research-list');
    var featuredEl = document.getElementById('research-featured');
    var typeFilter = document.getElementById('filter-research-type');

    if(typeFilter){
      var types = Array.from(new Set(DB.research.map(function(r){ return r.type; })));
      typeFilter.innerHTML = '<option value="">전체</option>' + types.map(function(t){
        return '<option value="' + esc(t) + '">' + esc(t) + '</option>';
      }).join('');
    }
    function paintList(){
      if(!listEl) return;
      var t = typeFilter ? typeFilter.value : '';
      var list = DB.research.filter(function(r){ return !t || r.type === t; });
      listEl.innerHTML = list.length ? list.map(researchItemHTML).join('') :
        '<p style="color:var(--ink-soft);">해당 유형의 자료가 없습니다.</p>';
      revealNow(listEl);
    }
    if(typeFilter) typeFilter.addEventListener('change', paintList);
    paintList();

    if(featuredEl){
      var featured = DB.research.filter(function(r){ return r.image; }).slice(0,2);
      featuredEl.innerHTML = featured.map(function(r){
        var linked = pick(DB.ecosystems, r.ecosystemIds)[0];
        var href = linked ? 'index.html?eco=' + encodeURIComponent(linked.id) + '#ecosystems' : 'species.html';
        return (
          '<a href="' + href + '" class="card" data-reveal>' +
            '<div class="card-media"><span class="card-tag">' + esc(r.type) + '</span><img src="' + esc(r.image) + '" alt="' + esc(r.title) + '"></div>' +
            '<div class="card-body"><h3>' + esc(r.title) + '</h3><p>' + esc(r.description) + '</p></div>' +
          '</a>'
        );
      }).join('');
      revealNow(featuredEl);
    }

    setupChartToggle(byId(DB.research, 'temperature-trend'));
  }

  // ---------------------------------------------------------
  // 통합 검색 (자동완성) — 모든 페이지 헤더 검색창 + 생태자료 큰 검색창
  // ---------------------------------------------------------
  function buildSearchIndex(){
    var idx = [];
    DB.species.forEach(function(s){ idx.push({ type:'생물', title:s.name, sub:s.scientificName, href:'species.html?id='+s.id }); });
    DB.ecosystems.forEach(function(e){ idx.push({ type:'생태계', title:e.name, sub:e.location, href:'index.html#ecosystems' }); });
    DB.exhibitions.forEach(function(e){ idx.push({ type:'전시', title:e.title, sub:e.location, href:'exhibition.html' }); });
    DB.education.forEach(function(e){ idx.push({ type:'교육', title:e.title, sub:e.target, href:'education.html' }); });
    DB.research.forEach(function(r){ idx.push({ type:'연구', title:r.title, sub:r.type, href:'data.html' }); });
    return idx;
  }

  function attachAutocomplete(input, list){
    if(!input) return;
    var wrap = input.closest('form') || input.parentElement;
    var dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';
    dropdown.hidden = true;
    wrap.style.position = wrap.style.position || 'relative';
    wrap.appendChild(dropdown);

    function paint(q){
      q = q.trim().toLowerCase();
      if(!q){ dropdown.hidden = true; dropdown.innerHTML = ''; return; }
      var matches = list.filter(function(item){
        return item.title.toLowerCase().indexOf(q) !== -1 || (item.sub||'').toLowerCase().indexOf(q) !== -1;
      }).slice(0, 7);
      if(!matches.length){
        dropdown.innerHTML = '<div class="search-dropdown-empty">검색 결과가 없습니다.</div>';
        dropdown.hidden = false;
        return;
      }
      dropdown.innerHTML = matches.map(function(m){
        return '<a href="' + m.href + '" class="search-dropdown-item"><span class="sd-type">' + esc(m.type) + '</span>' +
          '<span class="sd-title">' + esc(m.title) + '</span>' +
          (m.sub ? '<span class="sd-sub">' + esc(m.sub) + '</span>' : '') + '</a>';
      }).join('');
      dropdown.hidden = false;
    }
    input.addEventListener('input', debounce(function(){ paint(input.value); }, 250));
    input.addEventListener('focus', function(){ if(input.value) paint(input.value); });
    document.addEventListener('click', function(e){
      if(!wrap.contains(e.target)) dropdown.hidden = true;
    });
  }

  function setupSearch(){
    var idx = buildSearchIndex();
    // 검색어를 공백으로 분리해 모든 키워드가 포함된 항목을 반환하는 헬퍼
    function multiMatch(item, q){
      var tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if(!tokens.length) return false;
      var haystack = (item.title + ' ' + (item.sub || '')).toLowerCase();
      return tokens.every(function(t){ return haystack.indexOf(t) !== -1; });
    }
    document.querySelectorAll('input[type="search"]').forEach(function(input){
      attachAutocomplete(input, idx);
      var form = input.closest('form');
      if(form){
        form.addEventListener('submit', function(e){
          e.preventDefault();
          var raw = input.value.trim();
          if(!raw) return;
          var match = idx.find(function(item){ return multiMatch(item, raw); });
          // 검색어가 인덱스에 있으면 해당 페이지로, 없으면 생물 도감 필터 결과로 이동
          window.location.href = match ? match.href : 'species.html?q=' + encodeURIComponent(raw);
        });
      }
    });
  }

  // ---------------------------------------------------------
  // 인터랙티브 지도: 드래그 이동 + 휠 확대·축소
  // ---------------------------------------------------------
  // ---------------------------------------------------------
  // 인터랙티브 지도: 드래그 이동(Pan) + 확대·축소(Zoom)
  // ---------------------------------------------------------
  function setupInteractiveMap(){
    document.querySelectorAll('.map-explore').forEach(function(mapEl){
      if(mapEl.hasAttribute('data-static-map')) return;
      var img = mapEl.querySelector('img');
      var pins = mapEl.querySelector('#map-pins') || mapEl.querySelector('.map-pins');
      var note = mapEl.querySelector('.map-note');
      var zoomControls = mapEl.querySelector('.map-zoom-controls');
      if(!img) return;

      var MIN_SCALE = 1, MAX_SCALE = 2.4, STEP = 0.3;
      var state = { scale: 1, x: 0, y: 0 };
      var isDragging = false;
      var startPos = { x: 0, y: 0 };

      function clampPan(){
        var rect = mapEl.getBoundingClientRect();
        var maxTx = (rect.width * (state.scale - 1)) / 2;
        var maxTy = (rect.height * (state.scale - 1)) / 2;
        state.x = Math.max(-maxTx, Math.min(maxTx, state.x));
        state.y = Math.max(-maxTy, Math.min(maxTy, state.y));
      }

      function apply(){
        clampPan();
        var t = 'translate(' + state.x + 'px, ' + state.y + 'px) scale(' + state.scale + ')';
        img.style.transform = t;
        img.style.transformOrigin = '50% 50%';
        if(pins){
          pins.style.transform = t;
          pins.style.transformOrigin = '50% 50%';
        }
        updateZoomButtons();
      }

      function updateZoomButtons(){
        if(!zoomControls) return;
        var inBtn = zoomControls.querySelector('[data-zoom="in"]');
        var outBtn = zoomControls.querySelector('[data-zoom="out"]');
        var resetBtn = zoomControls.querySelector('[data-zoom="reset"]');
        if(inBtn) inBtn.disabled = state.scale >= MAX_SCALE - 0.001;
        if(outBtn) outBtn.disabled = state.scale <= MIN_SCALE + 0.001;
        if(resetBtn) resetBtn.disabled = state.scale <= MIN_SCALE + 0.001;
      }

      function setScale(next){
        state.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
        if(state.scale === MIN_SCALE){
          state.x = 0;
          state.y = 0;
        }
        apply();
        if(note) note.style.opacity = state.scale > MIN_SCALE ? '0' : '';
      }

      function resetView(){
        state.scale = MIN_SCALE;
        state.x = 0;
        state.y = 0;
        apply();
        if(note) note.style.opacity = '';
      }

      if(zoomControls){
        var inBtn = zoomControls.querySelector('[data-zoom="in"]');
        var outBtn = zoomControls.querySelector('[data-zoom="out"]');
        var resetBtn = zoomControls.querySelector('[data-zoom="reset"]');
        if(inBtn) inBtn.addEventListener('click', function(){ setScale(state.scale + STEP); });
        if(outBtn) outBtn.addEventListener('click', function(){ setScale(state.scale - STEP); });
        if(resetBtn) resetBtn.addEventListener('click', resetView);
      }

      img.style.willChange = 'transform';
      img.style.transition = 'transform .05s linear';
      img.style.userSelect = 'none';
      // 모바일: scale=1(기본)일 때는 터치 스크롤을 방해하지 않도록 pan-x/pan-y 허용
      // scale > 1(확대됨)일 때만 none으로 전환하여 드래그 이동을 활성화
      img.style.touchAction = 'pan-x pan-y';
      apply();

      // 마우스/터치 드래그 이동 (Pan)
      function onPointerDown(e){
        if(state.scale <= MIN_SCALE) return;
        isDragging = true;
        startPos = { x: e.clientX - state.x, y: e.clientY - state.y };
        mapEl.style.cursor = 'grabbing';
      }
      function onPointerMove(e){
        if(!isDragging || state.scale <= MIN_SCALE) return;
        state.x = e.clientX - startPos.x;
        state.y = e.clientY - startPos.y;
        apply();
      }
      function onPointerUp(){
        if(!isDragging) return;
        isDragging = false;
        mapEl.style.cursor = state.scale > MIN_SCALE ? 'grab' : '';
      }

      mapEl.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      // scale 변경 시 touchAction 동기화 (확대 상태에서만 드래그 이동 활성화)
      function syncTouchAction(){
        img.style.touchAction = state.scale > MIN_SCALE ? 'none' : 'pan-x pan-y';
      }
      var _origSetScale = setScale;
      setScale = function(next){
        _origSetScale(next);
        syncTouchAction();
      };

      // 모바일 핀치 줌 (두 손가락)
      var pinch = { active: false, startDist: 0, startScale: 1 };
      function touchDist(t0, t1){
        var dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY;
        return Math.sqrt(dx*dx + dy*dy);
      }
      img.addEventListener('touchstart', function(e){
        if(e.touches.length === 2){
          pinch.active = true;
          pinch.startDist = touchDist(e.touches[0], e.touches[1]);
          pinch.startScale = state.scale;
        }
      }, {passive:true});
      img.addEventListener('touchmove', function(e){
        if(!pinch.active || e.touches.length !== 2) return;
        var dist = touchDist(e.touches[0], e.touches[1]);
        setScale(pinch.startScale * (dist / pinch.startDist));
      }, {passive:true});
      img.addEventListener('touchend', function(e){
        if(e.touches.length < 2) pinch.active = false;
      });
    });
  }

  function revealNow(container){
    var io = window.__nieRevealObserver;
    var els = container.querySelectorAll('[data-reveal]');
    if(io){
      els.forEach(function(el){ io.observe(el); });
    } else {
      els.forEach(function(el){ el.classList.add('is-visible'); });
    }
  }

  // ---------------------------------------------------------
  // 진입점
  // ---------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function(){
    loadAll().then(function(){
      var page = document.body.getAttribute('data-page');
      if(page === 'home') renderHome();
      if(page === 'species') renderSpeciesPage();
      if(page === 'exhibition') renderExhibitionPage();
      if(page === 'education') renderEducationPage();
      if(page === 'data') renderDataPage();
      setupSearch();
      setupInteractiveMap();
    }).catch(function(err){
      // 이 catch는 FALLBACK_DB 전환 이후에도 예기치 못한 렌더링 오류가 발생했을 때만 실행됩니다.
      console.error('데이터 렌더링 실패:', err);
    });
  });
})();
