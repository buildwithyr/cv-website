/* One moving document strip and one continuous photographic oak board. No wheel capture. */
(() => {
  'use strict';
  const viewport = document.querySelector('.journey-viewport');
  const track = document.querySelector('.journey-track');
  const panels = [...document.querySelectorAll('.journey-panel')];
  const board = document.querySelector('.wood-board');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 900px)');
  let current = -1, settleTimer, frame = 0, lastLight = 0, x = 0, y = 0, targetX = 0, targetY = 0, visible = true;
  const number = document.querySelector('.journey-number');
  const announce = document.querySelector('.journey-announcement');
  const privacy = document.querySelector('#privacy-dialog');
  const fit = () => { if(current >= 0) viewport.style.height = panels[current].offsetHeight + 'px'; };
  const resize = new ResizeObserver(fit);
  panels.forEach(panel => resize.observe(panel));
  function go(key, {historyEntry = false, focus = false, instant = false} = {}) {
    const next = panels.findIndex(panel => panel.id === key);
    if(next < 0 || next === current) return;
    const previous = current;
    current = next;
    clearTimeout(settleTimer);
    // Native vertical scrolling remains untouched; only section navigation returns to its heading.
    if(previous >= 0) window.scrollTo({top:0, behavior:'instant'});
    if(instant) track.style.transition = 'none';
    else track.style.removeProperty('transition');
    track.classList.add('is-moving');
    panels.forEach((panel,index) => {
      panel.inert = index !== current;
      panel.setAttribute('aria-hidden', String(index !== current));
      panel.classList.toggle('is-active',index === current);
    });
    document.querySelectorAll('.main-nav [data-journey]').forEach(link => {
      if(link.dataset.journey === key) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    track.style.transform = `translate3d(${-100 * current}%,0,0)`;
    number.textContent = String(current + 1).padStart(2,'0');
    document.documentElement.style.setProperty('--journey-progress', `${(current + 1) / 6 * 100}%`);
    document.title = `${panels[current].dataset.title} — Yannick Reiter`;
    if(historyEntry) history.pushState(null,'','#'+key);
    fit();
    settleTimer = setTimeout(() => {
      track.classList.remove('is-moving');
      announce.textContent = panels[current].dataset.title;
      if(focus) panels[current].querySelector('h1').focus({preventScroll:true});
    }, instant || motion.matches ? 0 : 880);
    start();
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-journey]');
    if(link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
      event.preventDefault();
      go(link.dataset.journey,{historyEntry:true,focus:true});
    }
    if(event.target.closest('[data-privacy]')) {event.preventDefault();privacy.showModal();}
  });
  const fromHash = () => {
    const key = location.hash.slice(1);
    if(panels.some(panel => panel.id === key)) go(key);
    else if(!key) go('start');
  };
  window.addEventListener('popstate',fromHash);
  window.addEventListener('hashchange',fromHash);
  privacy.addEventListener('click', event => {if(event.target === privacy) privacy.close();});
  // One cheap transform update per frame while the hero is visible. Mobile uses a smaller idle drift.
  function tick(time) {
    frame = 0;
    if(!visible || document.hidden || motion.matches) return;
    x += (targetX-x)*.045; y += (targetY-y)*.045;
    const idle = Math.sin(time / 6200) * (narrow.matches ? .22 : .35);
    board.style.setProperty('--wood-x',`${(x+idle)*4}px`);
    board.style.setProperty('--wood-y',`${y*2+idle}px`);
    board.style.setProperty('--wood-tilt',`${-x*.5}deg`);
    const hero = panels[current].querySelector('.journey-hero');
    if(time-lastLight > 100) {
      hero.style.setProperty('--light-x',`${72+x*8+idle*2}%`);
      hero.style.setProperty('--light-y',`${30+y*8}%`);
      const inset = board.querySelectorAll('[result="inset"]')[current];
      inset.setAttribute('dx', String(4+x*1.5));
      inset.setAttribute('dy', String(7+y*1.5));
      lastLight=time;
    }
    frame = requestAnimationFrame(tick);
  }
  function start() {if(!frame && visible && !document.hidden && !motion.matches) frame=requestAnimationFrame(tick);}
  function stop() {cancelAnimationFrame(frame);frame=0;}
  window.addEventListener('pointermove',event => {
    if(event.pointerType !== 'mouse' || motion.matches) return;
    targetX=event.clientX/innerWidth*2-1; targetY=event.clientY/innerHeight*2-1;
  },{passive:true});
  document.addEventListener('pointerleave',()=>{targetX=targetY=0;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start();});
  motion.addEventListener('change',()=>{
    if(motion.matches){stop();board.style.removeProperty('--wood-x');board.style.removeProperty('--wood-y');}
    else start();
  });
  new IntersectionObserver(entries => {visible=entries[0].isIntersecting;if(visible)start();else stop();}).observe(board);
  window.addEventListener('resize',fit,{passive:true});
  let scrollFrame = 0;
  window.addEventListener('scroll', () => {
    if(scrollFrame) return;
    scrollFrame=requestAnimationFrame(() => {
      scrollFrame=0;
      const progress=Math.min(1,window.scrollY / Math.max(1,board.offsetHeight));
      board.style.opacity=String(1-progress*.5);
    });
  },{passive:true});
  if(document.fonts) document.fonts.ready.then(fit);
  const initial = location.hash.slice(1);
  go(panels.some(p=>p.id===initial)?initial:'start',{instant:true});
})();
