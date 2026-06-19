/* Ristobello — scroll-LINKED build-up.
   Every animation is tied directly to scroll position (scrub):
   the page forms itself as you scroll, reverses when you scroll back,
   and freezes the instant you stop. No timed autoplay.
   Requires GSAP + ScrollTrigger + Lenis (loaded before this file).
   Degrades gracefully if libraries are missing or reduced-motion is on. */

window.addEventListener('load', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Touch devices (phones/tablets, any orientation): skip the heavy scroll-linked
  // engine — Lenis smooth-scroll, scrubbed ScrollTriggers, parallax — and use
  // plain native scrolling. Lenis' eased momentum is the main cause of the
  // "keeps gliding / can't keep up" jank on touch.
  var isTouch = window.matchMedia('(max-width: 767px)').matches
    || window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  var hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  // Scroll progress bar
  var bar = document.querySelector('.scroll-progress');
  function updateBar() {
    if (!bar) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', updateBar, { passive: true });
  updateBar();

  if (reduce || isTouch || !hasGSAP) {
    document.body.classList.add('no-anim');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ---- Lenis smooth scroll ----
  var lenis = null;
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  document.querySelectorAll('a[data-scroll]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id && id.charAt(0) === '#' && document.querySelector(id)) {
        e.preventDefault();
        if (lenis) lenis.scrollTo(id, { offset: -50, duration: 1.3 });
        else document.querySelector(id).scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ---- Hero background parallax (scrubbed, homepage only) ----
  if (document.querySelector('.chapter--hero')) {
    gsap.fromTo('.xhero-bg', { yPercent: -6, scale: 1.05 }, {
      yPercent: 18, scale: 1.22, ease: 'none',
      scrollTrigger: { trigger: '.chapter--hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  // ---- Directional build-up presets: [from, to] ----
  var ANIM = {
    up:    [{ y: 90,  autoAlpha: 0 }, { y: 0, autoAlpha: 1 }],
    down:  [{ y: -90, autoAlpha: 0 }, { y: 0, autoAlpha: 1 }],
    left:  [{ x: -120, autoAlpha: 0 }, { x: 0, autoAlpha: 1 }],
    right: [{ x: 120,  autoAlpha: 0 }, { x: 0, autoAlpha: 1 }],
    scale: [{ scale: 0.75, autoAlpha: 0 }, { scale: 1, autoAlpha: 1 }],
    zoom:  [{ scale: 1.2,  autoAlpha: 0 }, { scale: 1, autoAlpha: 1 }],
    flip:  [{ rotationX: -70, autoAlpha: 0, transformOrigin: '50% 100%' }, { rotationX: 0, autoAlpha: 1 }],
    blur:  [{ autoAlpha: 0, filter: 'blur(20px)', scale: 1.05 }, { autoAlpha: 1, filter: 'blur(0px)', scale: 1 }]
  };

  // Single elements — scrubbed to their own scroll range
  gsap.utils.toArray('[data-anim]').forEach(function (el) {
    var pair = ANIM[el.dataset.anim] || ANIM.up;
    var to = Object.assign({ ease: 'none' }, pair[1]);
    to.scrollTrigger = {
      trigger: el,
      start: el.dataset.start || 'top 92%',
      end: el.dataset.end || 'top 48%',
      scrub: true
    };
    gsap.fromTo(el, pair[0], to);
  });

  // Groups — scrubbed with stagger across the range
  gsap.utils.toArray('[data-anim-group]').forEach(function (group) {
    var pair = ANIM[group.dataset.animGroup] || ANIM.up;
    var to = Object.assign({ ease: 'none', stagger: 0.25 }, pair[1]);
    to.scrollTrigger = { trigger: group, start: 'top 90%', end: 'bottom 55%', scrub: true };
    gsap.fromTo(group.children, pair[0], to);
  });

  // Word-by-word headline — scrubbed
  gsap.utils.toArray('.reveal-text').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function (w) {
      return '<span class="w"><span class="w-in">' + w + '</span></span>';
    }).join(' ');
    gsap.fromTo(el.querySelectorAll('.w-in'), { yPercent: 120 }, {
      yPercent: 0, ease: 'none', stagger: 0.18,
      scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 45%', scrub: true }
    });
  });

  // Image parallax inside frames — scrubbed
  gsap.utils.toArray('[data-speed]').forEach(function (el) {
    var speed = parseFloat(el.dataset.speed) || 0;
    gsap.fromTo(el, { yPercent: -speed }, {
      yPercent: speed, ease: 'none',
      scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  // Marquee — moves only while you scroll
  var mtrack = document.querySelector('.marquee-track');
  if (mtrack) {
    gsap.fromTo(mtrack, { xPercent: 0 }, {
      xPercent: -50, ease: 'none',
      scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  // ---- Horizontal pinned gallery — desktop/tablet only ----
  // On phones (<768px) the pin is skipped; the gallery becomes a native
  // horizontal swipe carousel (see scroll.css), which feels far better on touch.
  var track = document.querySelector('.hgallery-track');
  var hsection = document.querySelector('.hgallery');
  if (track && hsection) {
    gsap.matchMedia().add('(min-width: 768px)', function () {
      var distance = function () { return track.scrollWidth - window.innerWidth; };
      var hTween = gsap.to(track, {
        x: function () { return -distance(); },
        ease: 'none',
        scrollTrigger: {
          trigger: hsection, start: 'top top',
          end: function () { return '+=' + distance(); },
          scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true
        }
      });

      gsap.utils.toArray('.hpanel-img').forEach(function (img) {
        gsap.fromTo(img, { scale: 1.3 }, {
          scale: 1, ease: 'none',
          scrollTrigger: { trigger: img.parentElement, containerAnimation: hTween, start: 'left right', end: 'center center', scrub: true }
        });
      });

      gsap.utils.toArray('.hpanel-label').forEach(function (label) {
        gsap.fromTo(label, { yPercent: 160, autoAlpha: 0 }, {
          yPercent: 0, autoAlpha: 1, ease: 'none',
          scrollTrigger: { trigger: label, containerAnimation: hTween, start: 'left 80%', end: 'left 40%', scrub: true }
        });
      });

      gsap.utils.toArray('.h-reveal').forEach(function (el) {
        gsap.fromTo(el, { y: 70, autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, ease: 'none',
          scrollTrigger: { trigger: el, containerAnimation: hTween, start: 'left 90%', end: 'left 45%', scrub: true }
        });
      });
    });
  }

  ScrollTrigger.refresh();
  window.addEventListener('resize', function () { ScrollTrigger.refresh(); });
});
