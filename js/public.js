/* ===== PUBLIC PAGE JS ===== */
'use strict';

const Pub = {
  /* ---- Config ---- */
  cfg() { return DB.getObj('config', { name:'Mi Negocio', tagline:'Confecciones a medida', phone:'', email:'', address:'', ig:'', fb:'', heroImg:'', aboutImg:'', logoImg:'', services:[], testimonials:[], gallery:[] }); },
  saveCfg(cfg) { DB.setObj('config', cfg); },

  /* ---- Init ---- */
  init() {
    this.applyConfig();
    this.renderGallery('all');
    this.bindNav();
    this.bindHeroScroll();
    this.generateParticles();
    this.animateCounters();
    this.bindContactForm();
    this.bindLightbox();
    // Admin buttons (only visible if logged in)
    if (Auth.isLoggedIn()) this.showAdminControls();
  },

  applyConfig() {
    const c = this.cfg();
    // Name & tagline
    document.querySelectorAll('[data-cfg="name"]').forEach(el => el.textContent = c.name || 'Mi Negocio');
    document.querySelectorAll('[data-cfg="tagline"]').forEach(el => el.textContent = c.tagline || '');
    document.querySelectorAll('[data-cfg="phone"]').forEach(el => el.textContent = c.phone || '');
    document.querySelectorAll('[data-cfg="email"]').forEach(el => el.textContent = c.email || '');
    document.querySelectorAll('[data-cfg="address"]').forEach(el => el.textContent = c.address || '');
    // Logo
    if (c.logoImg) {
      document.querySelectorAll('[data-logo]').forEach(el => {
        el.outerHTML = `<img src="${c.logoImg}" alt="${c.name}" data-logo style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--pub-accent)">`;
      });
    }
    // Hero background image
    if (c.heroImg) {
      const heroBg = document.getElementById('heroBg');
      if (heroBg) heroBg.style.backgroundImage = `url(${c.heroImg})`;
    }
    // About image
    if (c.aboutImg) {
      const aWrap = document.getElementById('aboutImgWrap');
      if (aWrap) aWrap.innerHTML = `<img src="${c.aboutImg}" alt="${c.name}" class="about-img">`;
    }
    // WA link
    if (c.phone) {
      const waLink = document.getElementById('waFloat');
      if (waLink) waLink.href = `https://wa.me/${c.phone.replace(/\D/g,'')}`;
    }
    // Services
    this.renderServices(c.services || []);
    // Testimonials
    this.renderTestimonials(c.testimonials || []);
    // Footer
    document.querySelectorAll('[data-cfg="ig"]').forEach(el => el.href = c.ig || '#');
    document.querySelectorAll('[data-cfg="fb"]').forEach(el => el.href = c.fb || '#');
    // Page title
    document.title = (c.name || 'Mi Negocio') + ' · Confecciones';
  },

  /* ---- Gallery ---- */
  renderGallery(filter) {
    const c = this.cfg();
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    const items = (c.gallery || []).filter(it => filter === 'all' || it.cat === filter);
    if (items.length === 0) {
      grid.innerHTML = `<div class="gallery-empty"><span>🖼️</span><p>Las fotos de los trabajos aparecerán aquí.</p></div>`;
      return;
    }
    grid.innerHTML = items.map((it, i) => `
      <div class="gallery-item" onclick="Pub.openLightbox(${i},'${filter}')">
        <img src="${it.src}" alt="${it.title || ''}">
        <div class="gallery-overlay">
          <span class="gallery-overlay-text">${it.title || ''}</span>
        </div>
      </div>`).join('');
  },

  openLightbox(idx, filter) {
    const c = this.cfg();
    const items = (c.gallery || []).filter(it => filter === 'all' || it.cat === filter);
    const it = items[idx];
    if (!it) return;
    const lb = document.getElementById('lightbox');
    lb.querySelector('img').src = it.src;
    lb.querySelector('.lightbox-caption').textContent = it.title || '';
    lb.classList.add('open');
  },

  bindLightbox() {
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    lb.querySelector('.lightbox-close').onclick = () => lb.classList.remove('open');
    lb.onclick = (e) => { if (e.target === lb) lb.classList.remove('open'); };
  },

  /* ---- Services ---- */
  renderServices(services) {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;
    const defaults = [
      { icon:'✂️', name:'Confección a Medida', desc:'Prendas únicas adaptadas perfectamente a cada cliente.' },
      { icon:'👘', name:'Delantales Personalizados', desc:'Diseños exclusivos con bordados y colores a pedido.' },
      { icon:'🧵', name:'Reparaciones y Ajustes', desc:'Arreglos rápidos y profesionales en toda prenda.' },
      { icon:'🏷️', name:'Pedidos por Mayor', desc:'Atención especial para empresas y pedidos en cantidad.' },
    ];
    const list = services.length ? services : defaults;
    grid.innerHTML = list.map(s => `
      <div class="service-card">
        <div class="service-icon">${s.icon || '🪡'}</div>
        <div class="service-name">${s.name}</div>
        <div class="service-desc">${s.desc}</div>
      </div>`).join('');
  },

  /* ---- Testimonials ---- */
  renderTestimonials(testimonials) {
    const grid = document.getElementById('testimonialsGrid');
    if (!grid) return;
    const defaults = [
      { name:'Empresa ABC', role:'Cliente corporativo', text:'Excelente calidad en los 50 delantales que pedimos. Bordados impecables y entrega puntual.', stars:5 },
      { name:'María González', role:'Cliente frecuente', text:'Me hicieron el vestido de mis sueños. Atención personalizada y precio justo.', stars:5 },
      { name:'Colegio San José', role:'Institución', text:'Uniformes de primera calidad para todo nuestro personal. Muy recomendable.', stars:5 },
    ];
    const list = testimonials.length ? testimonials : defaults;
    grid.innerHTML = list.map(t => `
      <div class="testimonial-card">
        <div class="testimonial-stars">${'★'.repeat(t.stars || 5)}</div>
        <div class="testimonial-text">"${t.text}"</div>
        <div class="testimonial-author">
          <div class="testimonial-avatar">${t.name[0]}</div>
          <div>
            <div class="testimonial-name">${t.name}</div>
            <div class="testimonial-role">${t.role}</div>
          </div>
        </div>
      </div>`).join('');
  },

  /* ---- Nav ---- */
  bindNav() {
    const burger = document.getElementById('navBurger');
    const links  = document.getElementById('navLinks');
    if (burger && links) {
      burger.onclick = () => links.classList.toggle('open');
    }
    // Smooth scroll for nav links
    document.querySelectorAll('.nav-links a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior:'smooth' });
        if (links) links.classList.remove('open');
      });
    });
    // Scroll-to-top on logo click
    const logo = document.querySelector('.nav-logo');
    if (logo) logo.style.cursor = 'pointer';
  },

  bindHeroScroll() {
    const nav = document.querySelector('.pub-nav');
    window.addEventListener('scroll', () => {
      nav?.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  },

  /* ---- Particles ---- */
  generateParticles() {
    const wrap = document.getElementById('heroParticles');
    if (!wrap) return;
    for (let i = 0; i < 20; i++) {
      const s = document.createElement('span');
      s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${Math.random()*8}s;animation-duration:${5+Math.random()*8}s;width:${2+Math.random()*4}px;height:${2+Math.random()*4}px;opacity:${.3+Math.random()*.6}`;
      wrap.appendChild(s);
    }
  },

  /* ---- Counters ---- */
  animateCounters() {
    const counters = document.querySelectorAll('[data-count]');
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        let current = 0;
        const step = Math.ceil(target / 50);
        const timer = setInterval(() => {
          current = Math.min(current + step, target);
          el.textContent = current + (el.dataset.suffix || '');
          if (current >= target) clearInterval(timer);
        }, 30);
        io.unobserve(el);
      });
    }, { threshold: .5 });
    counters.forEach(c => io.observe(c));
  },

  /* ---- Contact ---- */
  bindContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      // Save contact request to localStorage
      const reqs = DB.get('contact_requests');
      reqs.push({ ...data, fecha: new Date().toISOString(), leido: false });
      DB.set('contact_requests', reqs);
      form.reset();
      document.getElementById('contactSuccess')?.classList.remove('d-none');
      setTimeout(() => document.getElementById('contactSuccess')?.classList.add('d-none'), 5000);
    };
  },

  /* ---- Admin controls (only when logged in) ---- */
  showAdminControls() {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
  },

  /* ---- Gallery filter ---- */
  filterGallery(cat, btn) {
    document.querySelectorAll('.gallery-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.renderGallery(cat);
  },
};

document.addEventListener('DOMContentLoaded', () => Pub.init());
