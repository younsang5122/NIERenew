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

  function loadAll(){
    return Promise.all([
      fetch('data/species.json').then(function(r){ return r.json(); }),
      fetch('data/ecosystems.json').then(function(r){ return r.json(); }),
      fetch('data/exhibitions.json').then(function(r){ return r.json(); }),
      fetch('data/education.json').then(function(r){ return r.json(); }),
      fetch('data/research.json').then(function(r){ return r.json(); })
    ]).then(function(res){
      DB.species = res[0]; DB.ecosystems = res[1]; DB.exhibitions = res[2];
      DB.education = res[3]; DB.research = res[4];
      return DB;
    });
  }

  // ---------------------------------------------------------
  // 카드 템플릿
  // ---------------------------------------------------------
  function speciesCard(sp){
    return (
      '<a class="card" href="species.html?id=' + esc(sp.id) + '" data-reveal data-tilt>' +
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
      '<div class="card species-feature" data-reveal data-parallax data-tilt>' +
        '<div class="card-media"><span class="card-tag">' + esc(eco.name) + ' · 3D 지도 확대·축소·드래그</span>' +
        '<img src="' + esc(eco.image) + '" alt="' + esc(eco.name) + '"></div>' +
        '<div class="card-body"><h3>' + esc(eco.name) + '</h3><p>' + esc(eco.description) + '</p>' +
        '<div class="link-flow">생태계<span class="arrow">→</span><b>' +
        esc(speciesList[0] ? speciesList[0].name : eco.location) + '</b><span class="arrow">→</span>전시·교육·연구</div>' +
        '</div></div>'
    );
    var side = speciesList.slice(0, 2).map(function(sp){
      return (
        '<a class="card" href="species.html?id=' + esc(sp.id) + '" data-reveal data-parallax data-tilt>' +
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
        'aria-selected="' + (i === 0 ? 'true' : 'false') + '" data-eco-tab="' + esc(eco.id) + '">' + esc(eco.name) + '</button>';
    }).join('');

    function paint(ecoId){
      var eco = byId(DB.ecosystems, ecoId) || DB.ecosystems[0];
      panelEl.innerHTML = ecosystemFeatureBlock(eco);
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
      var picks = [DB.exhibitions[0], DB.education[0], DB.research[3]].filter(Boolean);
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
        'title="' + esc(eco.name) + '" aria-label="' + esc(eco.name) + ' 보기"></button>';
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
    var badge3d = document.getElementById('sp-badge-3d');
    var titleEl = document.getElementById('sp-title');
    var descEl = document.getElementById('sp-desc');
    var flowEl = document.getElementById('sp-flow');
    var factsEl = document.getElementById('sp-facts');
    var ctaEl = document.getElementById('sp-cta');
    if(!titleEl) return;

    document.title = sp.name + ' | 생물 발견 | 국립생태원';
    // 히어로 영역의 대표 이미지는 이 한 요소(sp-hero-img)만 sp.image와 연결됩니다.
    if(heroImg){ heroImg.src = sp.image; heroImg.alt = sp.name; }
    if(badgeLevel) badgeLevel.textContent = sp.protectionLevel;
    // 3D 모델이 실제로 있는 생물만 "3D Model" 배지를 노출합니다.
    if(badge3d) badge3d.style.display = sp.model3D ? 'inline-flex' : 'none';
    titleEl.innerHTML = esc(sp.name) + ' <span class="sci">' + esc(sp.scientificName) + '</span>';
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
      var q = reqQ.toLowerCase();
      var list = DB.species.filter(function(s){
        var matchesQ = !q ||
          s.name.toLowerCase().indexOf(q) !== -1 ||
          s.scientificName.toLowerCase().indexOf(q) !== -1 ||
          s.habitat.toLowerCase().indexOf(q) !== -1 ||
          s.category.toLowerCase().indexOf(q) !== -1;
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
    var badgeClass = ex.period === '상설전시' ? '' : '';
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
        '<div class="meta-row"><span>🗓 ' + esc(ed.date) + '</span><span>⏱ ' + esc(ed.duration) + '</span></div>' +
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
    return '<div class="research-item"><span class="r-icon" aria-hidden="true">' + docIcon() + '</span>' +
      '<div><h4>' + esc(r.title) + '</h4><p>' + esc(r.description) + '</p></div></div>';
  }

  function renderDataPage(){
    var listEl = document.getElementById('research-list');
    var featuredEl = document.getElementById('research-featured');
    if(listEl){
      listEl.innerHTML = DB.research.map(researchItemHTML).join('');
    }
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
    input.addEventListener('input', function(){ paint(input.value); });
    input.addEventListener('focus', function(){ if(input.value) paint(input.value); });
    document.addEventListener('click', function(e){
      if(!wrap.contains(e.target)) dropdown.hidden = true;
    });
  }

  function setupSearch(){
    var idx = buildSearchIndex();
    document.querySelectorAll('input[type="search"]').forEach(function(input){
      attachAutocomplete(input, idx);
      var form = input.closest('form');
      if(form){
        form.addEventListener('submit', function(e){
          e.preventDefault();
          var q = input.value.trim().toLowerCase();
          if(!q) return;
          var match = idx.find(function(item){
            return item.title.toLowerCase().indexOf(q) !== -1 || (item.sub||'').toLowerCase().indexOf(q) !== -1;
          });
          // 정확히 일치하는 항목이 없어도 검색이 "아무 반응 없음"으로 끝나지 않도록,
          // 생물 도감 페이지로 이동해 검색어 기준으로 필터링된 결과(또는 결과 없음 안내)를 보여줍니다.
          window.location.href = match ? match.href : 'species.html?q=' + encodeURIComponent(input.value.trim());
        });
      }
    });
  }

  // ---------------------------------------------------------
  // 인터랙티브 지도: 드래그 이동 + 휠 확대·축소
  // ---------------------------------------------------------
  function setupInteractiveMap(){
    document.querySelectorAll('.map-explore').forEach(function(mapEl){
      var img = mapEl.querySelector('img');
      var pins = mapEl.querySelector('#map-pins') || mapEl.querySelector('.map-pins');
      var note = mapEl.querySelector('.map-note');
      if(!img) return;

      var state = { x:0, y:0, scale:1, dragging:false, sx:0, sy:0 };
      function apply(){
        var t = 'translate(' + state.x + 'px,' + state.y + 'px) scale(' + state.scale + ')';
        img.style.transform = t;
        img.style.transformOrigin = '0 0';
        if(pins){ pins.style.transform = t; pins.style.transformOrigin = '0 0'; }
      }
      img.style.willChange = 'transform';
      img.style.cursor = 'grab';
      img.style.transition = 'transform .05s linear';

      mapEl.addEventListener('wheel', function(e){
        e.preventDefault();
        var delta = e.deltaY > 0 ? -0.1 : 0.1;
        state.scale = Math.min(2.4, Math.max(1, state.scale + delta));
        if(state.scale === 1){ state.x = 0; state.y = 0; }
        apply();
      }, { passive:false });

      img.addEventListener('mousedown', function(e){
        e.preventDefault();
        state.dragging = true; state.sx = e.clientX - state.x; state.sy = e.clientY - state.y;
        img.style.cursor = 'grabbing';
        if(note) note.style.opacity = '0';
      });
      window.addEventListener('mousemove', function(e){
        if(!state.dragging) return;
        var maxOffset = 120 * state.scale;
        state.x = Math.max(-maxOffset, Math.min(maxOffset, e.clientX - state.sx));
        state.y = Math.max(-maxOffset, Math.min(maxOffset, e.clientY - state.sy));
        apply();
      });
      window.addEventListener('mouseup', function(){
        state.dragging = false;
        if(img) img.style.cursor = 'grab';
      });

      // 터치 지원 (모바일 드래그)
      img.addEventListener('touchstart', function(e){
        var t = e.touches[0];
        state.dragging = true; state.sx = t.clientX - state.x; state.sy = t.clientY - state.y;
      }, {passive:true});
      img.addEventListener('touchmove', function(e){
        if(!state.dragging) return;
        var t = e.touches[0];
        var maxOffset = 120 * state.scale;
        state.x = Math.max(-maxOffset, Math.min(maxOffset, t.clientX - state.sx));
        state.y = Math.max(-maxOffset, Math.min(maxOffset, t.clientY - state.sy));
        apply();
      }, {passive:true});
      img.addEventListener('touchend', function(){ state.dragging = false; });
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
      console.error('데이터 로드 실패:', err);
      var notice = document.createElement('div');
      notice.style.cssText = 'background:#c1443a;color:#fff;padding:12px 20px;font-size:13px;text-align:center;';
      notice.textContent = '데이터를 불러오지 못했습니다. 로컬 서버(예: python -m http.server)로 접속했는지 확인해주세요.';
      document.body.prepend(notice);
    });
  });
})();
