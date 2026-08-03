/* =========================================================
   SpeakUp English — 인터랙션 스크립트
   1) 모바일 메뉴  2) 헤더 상태 & 현재 섹션  3) 스크롤 리빌
   4) 숫자 카운트업  5) 강의/후기 필터  6) 후기 슬라이더
   7) 요금제 토글  8) FAQ 아코디언  9) 신청 폼 검증
   10) 맨 위로 버튼
   각 블록은 관련 DOM이 없는 페이지에서는 조용히 스킵합니다.
   ========================================================= */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1) 모바일 메뉴
     --------------------------------------------------------- */
  const nav = $('#nav');
  const navToggle = $('#navToggle');

  if (nav && navToggle) {
    const closeNav = () => {
      nav.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', '메뉴 열기');
    };

    navToggle.addEventListener('click', () => {
      const willOpen = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', willOpen);
      navToggle.classList.toggle('is-open', willOpen);
      navToggle.setAttribute('aria-expanded', String(willOpen));
      navToggle.setAttribute('aria-label', willOpen ? '메뉴 닫기' : '메뉴 열기');
    });

    $$('#nav a').forEach((a) => a.addEventListener('click', closeNav));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNav();
    });
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('is-open')) return;
      if (!nav.contains(e.target) && !navToggle.contains(e.target)) closeNav();
    });
  }

  /* ---------------------------------------------------------
     2) 헤더 그림자 + 현재 보고 있는 섹션 메뉴 강조 (+ 맨 위로 버튼 표시)
     index.html처럼 #anchor 형태의 nav__link가 있는 페이지에서만
     스크롤 스파이가 동작합니다. 다른 페이지는 헤더 그림자/맨위로만 동작.
     --------------------------------------------------------- */
  const header = $('#header');
  const toTop = $('#toTop');
  const navLinks = $$('.nav__link');
  const spySections = navLinks
    .map((link) => (link.getAttribute('href') || '').startsWith('#') ? $(link.getAttribute('href')) : null)
    .filter(Boolean);

  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-stuck', y > 8);

    if (spySections.length) {
      const line = y + (header ? header.offsetHeight : 0) + 24;
      let currentId = '';
      spySections.forEach((sec) => {
        if (sec.offsetTop <= line) currentId = sec.id;
      });
      navLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + currentId);
      });
    }

    if (toTop) toTop.hidden = y < 500;
  };

  /* ---------------------------------------------------------
     3) 스크롤 리빌 애니메이션
     --------------------------------------------------------- */
  const revealItems = $$('.reveal');
  if (revealItems.length) {
    revealItems.forEach((el) => {
      const delay = el.dataset.revealDelay;
      if (delay) el.style.setProperty('--delay', delay + 'ms');
    });

    if (prefersReduced || !('IntersectionObserver' in window)) {
      revealItems.forEach((el) => el.classList.add('is-visible'));
      $$('.meter__bar').forEach((b) => b.classList.add('is-filled'));
    } else {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px' }
      );
      revealItems.forEach((el) => revealObserver.observe(el));

      const meterBars = $$('.meter__bar');
      if (meterBars.length) {
        const meterObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add('is-filled');
              meterObserver.unobserve(entry.target);
            });
          },
          { threshold: 0.4 }
        );
        meterBars.forEach((b) => meterObserver.observe(b));
      }
    }
  }

  /* ---------------------------------------------------------
     4) 숫자 카운트업
     --------------------------------------------------------- */
  const formatNumber = (value, decimals) =>
    decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString('ko-KR');

  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = formatNumber(target * eased, decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const counters = $$('[data-count]');
  if (counters.length) {
    if (prefersReduced || !('IntersectionObserver' in window)) {
      counters.forEach((el) => {
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        el.textContent = formatNumber(parseFloat(el.dataset.count), decimals) + (el.dataset.suffix || '');
      });
    } else {
      const countObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            countUp(entry.target);
            countObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach((el) => countObserver.observe(el));
    }
  }

  /* ---------------------------------------------------------
     5) 강의 카테고리 필터 (courses.html)
     --------------------------------------------------------- */
  const courseGrid = $('#courseGrid');
  const courses = courseGrid ? $$('.course', courseGrid) : [];
  const courseEmpty = $('#courseEmpty');
  const filterButtons = $$('.filter');

  if (courseGrid && courses.length && filterButtons.length) {
    const filters = filterButtons.filter((btn) => !btn.closest('#reviewFilters'));
    filters.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.filter;

        filters.forEach((f) => {
          const active = f === btn;
          f.classList.toggle('is-active', active);
          f.setAttribute('aria-selected', String(active));
        });

        let shown = 0;
        courses.forEach((card) => {
          const match = key === 'all' || card.dataset.category === key;
          card.classList.toggle('is-hidden', !match);
          if (match) shown++;
        });

        if (courseEmpty) courseEmpty.hidden = shown !== 0;
      });
    });
  }

  /* ---------------------------------------------------------
     5b) 후기 카테고리 필터 (reviews.html — 그리드+필터)
     --------------------------------------------------------- */
  const reviewFilters = $('#reviewFilters');
  const reviewGrid = $('#reviewGrid');
  const reviewCards = reviewGrid ? $$('.review-card', reviewGrid) : [];
  const reviewEmpty = $('#reviewEmpty');

  if (reviewFilters && reviewGrid && reviewCards.length) {
    const rFilters = $$('.filter', reviewFilters);
    rFilters.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.filter;

        rFilters.forEach((f) => {
          const active = f === btn;
          f.classList.toggle('is-active', active);
          f.setAttribute('aria-selected', String(active));
        });

        let shown = 0;
        reviewCards.forEach((card) => {
          const match = key === 'all' || card.dataset.category === key;
          card.classList.toggle('is-hidden', !match);
          if (match) shown++;
        });

        if (reviewEmpty) reviewEmpty.hidden = shown !== 0;
      });
    });
  }

  /* ---------------------------------------------------------
     6) 후기 슬라이더 (index.html 등 슬라이더가 있는 페이지 전용)
     --------------------------------------------------------- */
  const track = $('#sliderTrack');
  const slider = $('#slider');
  const dotsBox = $('#sliderDots');
  const nextBtn = $('#nextBtn');
  const prevBtn = $('#prevBtn');

  if (track && slider && dotsBox) {
    const slides = $$('.slide', track);
    let index = 0;
    let autoTimer = null;

    const renderDots = () => {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `${i + 1}번째 후기 보기`);
        dot.addEventListener('click', () => goTo(i));
        dotsBox.appendChild(dot);
      });
    };

    const goTo = (i) => {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      $$('button', dotsBox).forEach((d, di) => d.classList.toggle('is-active', di === index));
    };

    const startAuto = () => {
      if (prefersReduced) return;
      stopAuto();
      autoTimer = setInterval(() => goTo(index + 1), 6000);
    };
    const stopAuto = () => {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = null;
    };

    if (slides.length) {
      renderDots();
      goTo(0);
      startAuto();
    }

    if (nextBtn) nextBtn.addEventListener('click', () => { goTo(index + 1); startAuto(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { goTo(index - 1); startAuto(); });

    slider.addEventListener('mouseenter', stopAuto);
    slider.addEventListener('mouseleave', startAuto);
    slider.addEventListener('focusin', stopAuto);
    slider.addEventListener('focusout', startAuto);

    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { goTo(index + 1); startAuto(); }
      if (e.key === 'ArrowLeft') { goTo(index - 1); startAuto(); }
    });

    let touchStartX = 0;
    track.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].clientX;
      stopAuto();
    }, { passive: true });
    track.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 45) goTo(index + (diff < 0 ? 1 : -1));
      startAuto();
    });
  }

  /* ---------------------------------------------------------
     7) 요금제 월/3개월 토글
     --------------------------------------------------------- */
  const planToggle = $('#planToggle');
  const labelMonthly = $('#labelMonthly');
  const labelYearly = $('#labelYearly');

  if (planToggle && labelMonthly && labelYearly) {
    planToggle.addEventListener('click', () => {
      const yearly = planToggle.getAttribute('aria-checked') !== 'true';
      planToggle.setAttribute('aria-checked', String(yearly));
      labelMonthly.classList.toggle('is-active', !yearly);
      labelYearly.classList.toggle('is-active', yearly);

      $$('.plan__price strong').forEach((el) => {
        el.textContent = yearly ? el.dataset.yearly : el.dataset.monthly;
      });
    });
  }

  /* ---------------------------------------------------------
     8) FAQ / 아코디언 (한 번에 하나만 열림, .acc가 있는 모든 페이지)
     --------------------------------------------------------- */
  const accItems = $$('.acc');
  if (accItems.length) {
    accItems.forEach((item) => {
      const btn = $('.acc__q', item);
      const panel = $('.acc__a', item);
      if (!btn || !panel) return;

      btn.addEventListener('click', () => {
        const group = item.closest('.accordion') || document;
        const isOpen = item.classList.contains('is-open');

        $$('.acc', group).forEach((other) => {
          other.classList.remove('is-open');
          const otherBtn = $('.acc__q', other);
          const otherPanel = $('.acc__a', other);
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          if (otherPanel) otherPanel.style.maxHeight = '';
        });

        if (!isOpen) {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      });
    });
  }

  /* ---------------------------------------------------------
     9) 신청 폼 검증
     --------------------------------------------------------- */
  const form = $('#applyForm');
  const formDone = $('#formDone');

  if (form && formDone) {
    const rules = {
      name: (v) => (v.trim().length >= 2 ? '' : '이름을 2자 이상 입력해 주세요.'),
      email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : '올바른 이메일 형식이 아닙니다.'),
      phone: (v) =>
        /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(v.replace(/\s/g, ''))
          ? ''
          : '연락처를 010-1234-5678 형식으로 입력해 주세요.',
      course: (v) => (v ? '' : '관심 강의를 선택해 주세요.'),
      agree: (v, el) => (el.checked ? '' : '개인정보 수집 및 이용에 동의해 주세요.'),
    };

    const showError = (name, message) => {
      const input = form.elements[name];
      if (!input) return;
      const box = $(`[data-error-for="${name}"]`, form);
      const field = input.closest('.field');
      if (box) box.textContent = message;
      if (field) field.classList.toggle('has-error', Boolean(message));
    };

    const validateField = (name) => {
      const input = form.elements[name];
      if (!input || !rules[name]) return true;
      const message = rules[name](input.value, input);
      showError(name, message);
      return !message;
    };

    Object.keys(rules).forEach((name) => {
      const input = form.elements[name];
      if (!input) return;
      input.addEventListener('blur', () => validateField(name));
      input.addEventListener('input', () => {
        if (input.closest('.field').classList.contains('has-error')) validateField(name);
      });
      input.addEventListener('change', () => {
        if (input.type === 'checkbox' || input.tagName === 'SELECT') validateField(name);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      formDone.hidden = true;

      let firstInvalid = null;
      Object.keys(rules).forEach((name) => {
        if (!validateField(name) && !firstInvalid) firstInvalid = form.elements[name];
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      // 실제 서비스라면 여기서 서버로 전송합니다. (fetch/POST)
      console.log('신청 데이터:', Object.fromEntries(new FormData(form).entries()));
      form.reset();
      formDone.hidden = false;
      formDone.scrollIntoView({ block: 'nearest', behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------
     10) 맨 위로 버튼 + 스크롤 리스너 연결
     --------------------------------------------------------- */
  if (toTop) {
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    const open = $('.acc.is-open .acc__a');
    if (open) open.style.maxHeight = open.scrollHeight + 'px';
  });
  onScroll();

  /* ---------------------------------------------------------
     11) 강의/강사 상세 아코디언 토글 (courses.html data-toggle)
     --------------------------------------------------------- */
  $$('[data-curric-toggle]').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('data-curric-toggle'));
    if (!panel) return;
    btn.addEventListener('click', () => {
      const open = panel.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? '커리큘럼 접기 ▲' : '커리큘럼 보기 ▼';
    });
  });
})();
