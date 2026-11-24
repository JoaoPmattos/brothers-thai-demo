'use strict';

(() => {
    const root = document.documentElement;
    root.classList.add('js');

    const header = document.getElementById('main-header');
    const backToTopBtn = document.getElementById('back-to-top');
    const menuToggle = document.getElementById('mobile-menu');
    const navMenu = document.getElementById('nav-menu');
    const desktopQuery = window.matchMedia('(min-width: 1200px)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ==========================================
    // CHEGOU COM ÂNCORA (ex.: /#horarios vindo de outra página)
    // ==========================================
    const goToHash = () => {
        const id = decodeURIComponent(window.location.hash.slice(1));
        if (!/^[a-z0-9-]+$/i.test(id)) return;
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
    };

    if (window.location.hash) {
        window.requestAnimationFrame(goToHash);
        window.addEventListener('load', goToHash, { once: true });
    }

    // ==========================================
    // MENU MOBILE (HAMBÚRGUER)
    // ==========================================
    const setMenu = (open) => {
        if (!navMenu || !menuToggle) return;
        navMenu.classList.toggle('is-active', open);
        menuToggle.classList.toggle('is-active', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
        document.body.classList.toggle('menu-open', open);
    };

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            setMenu(!navMenu.classList.contains('is-active'));
        });

        navMenu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => setMenu(false));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('is-active')) {
                setMenu(false);
                menuToggle.focus();
            }
        });

        document.addEventListener('click', (e) => {
            if (navMenu.classList.contains('is-active') &&
                !navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                setMenu(false);
            }
        });

        desktopQuery.addEventListener('change', (e) => {
            if (e.matches) setMenu(false);
        });
    }

    // ==========================================
    // SCROLL: HEADER E BOTÃO TOPO (otimizado)
    // ==========================================
    let ticking = false;
    const onScroll = () => {
        const y = window.scrollY;
        if (header) header.classList.toggle('scrolled', y > 50);
        if (backToTopBtn) backToTopBtn.classList.toggle('show', y > 500);
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(onScroll);
            ticking = true;
        }
    }, { passive: true });
    window.requestAnimationFrame(onScroll);

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        });
    }

    if ('IntersectionObserver' in window) {
        // Pausa as animações infinitas das seções fora da tela
        const animIO = new IntersectionObserver((entries) => {
            entries.forEach((en) => en.target.classList.toggle('anim-off', !en.isIntersecting));
        }, { rootMargin: '100px 0px' });
        document.querySelectorAll('main > section, footer').forEach((s) => animIO.observe(s));

        // Marca no menu a seção que está na tela
        const navLinks = navMenu ? [...navMenu.querySelectorAll('a[href^="#"]')] : [];
        const navIO = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                navLinks.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        document.querySelectorAll('main > section[id]').forEach((s) => navIO.observe(s));
    }

    // ==========================================
    // ANIMAÇÃO AO ROLAR (reveal)
    // A classe sai depois da entrada para não travar o hover dos cards.
    // ==========================================
    const finishReveal = (el) => {
        el.classList.add('is-visible');
        window.setTimeout(() => el.classList.remove('reveal', 'is-visible'), 1000);
    };

    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !reduceMotion.matches) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    finishReveal(entry.target);
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        reveals.forEach((el) => io.observe(el));
    } else {
        reveals.forEach((el) => el.classList.remove('reveal'));
    }

    // ==========================================
    // EQUIPE: ABAS POR UNIDADE (acessível por teclado)
    // ==========================================
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const selectTab = (tab) => {
        tabs.forEach((t) => {
            const on = t === tab;
            t.setAttribute('aria-selected', String(on));
            t.tabIndex = on ? 0 : -1;
            const panel = document.getElementById(t.getAttribute('aria-controls') || '');
            if (panel) panel.hidden = !on;
        });
    };

    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => selectTab(tab));
        tab.addEventListener('keydown', (e) => {
            let next = null;
            if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
            if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
            if (next) {
                e.preventDefault();
                selectTab(next);
                next.focus();
            }
        });
    });

    // ==========================================
    // CARROSSEL DE FOTOS (sobre)
    // Passa sozinho a cada 5s; pausa com mouse/foco ou fora da tela.
    // ==========================================
    const carousel = document.getElementById('about-carousel');
    if (carousel) {
        const track = carousel.querySelector('.carousel-track');
        const slides = [...carousel.querySelectorAll('.carousel-slide')];
        const dotsBox = carousel.querySelector('.carousel-dots');
        let current = 0;
        let timer = null;
        let visible = false;
        let hovering = false;

        const dots = slides.map((slide, i) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'carousel-dot';
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-label', 'Foto ' + (i + 1));
            dot.addEventListener('click', () => goTo(i));
            dotsBox.appendChild(dot);
            return dot;
        });

        const mark = (i) => {
            current = i;
            dots.forEach((d, n) => d.setAttribute('aria-selected', String(n === i)));
        };

        const goTo = (i) => {
            const n = (i + slides.length) % slides.length;
            track.scrollTo({ left: slides[n].offsetLeft, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
            mark(n);
        };

        carousel.querySelector('.prev').addEventListener('click', () => goTo(current - 1));
        carousel.querySelector('.next').addEventListener('click', () => goTo(current + 1));

        // Arrastar com o dedo também atualiza os pontinhos
        let scrollTick = false;
        track.addEventListener('scroll', () => {
            if (scrollTick) return;
            scrollTick = true;
            window.requestAnimationFrame(() => {
                mark(Math.round(track.scrollLeft / track.clientWidth));
                scrollTick = false;
            });
        }, { passive: true });

        track.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') goTo(current + 1);
            if (e.key === 'ArrowLeft') goTo(current - 1);
        });

        const play = () => {
            window.clearInterval(timer);
            timer = null;
            if (visible && !hovering && !reduceMotion.matches) {
                timer = window.setInterval(() => goTo(current + 1), 5000);
            }
        };

        carousel.addEventListener('mouseenter', () => { hovering = true; play(); });
        carousel.addEventListener('mouseleave', () => { hovering = false; play(); });
        carousel.addEventListener('focusin', () => { hovering = true; play(); });
        carousel.addEventListener('focusout', () => { hovering = false; play(); });

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([en]) => {
                visible = en.isIntersecting;
                play();
            }, { threshold: 0.4 }).observe(carousel);
        }

        mark(0);
    }

    // ==========================================
    // HORÁRIOS: DESTACA O DIA DE HOJE
    // ==========================================
    const schedule = document.getElementById('schedule');
    const today = new Date().getDay(); // 0 = domingo
    if (schedule && today >= 1 && today <= 6) {
        const th = schedule.querySelector(`thead th[data-day="${today}"]`);
        if (th) {
            th.classList.add('is-today');
            th.setAttribute('aria-label', th.textContent + ' (hoje)');
            const col = [...th.parentElement.children].indexOf(th);
            schedule.querySelectorAll('tbody tr').forEach((tr) => {
                tr.children[col]?.classList.add('is-today');
            });
        }
    }

    // ==========================================
    // SELO "AULA AGORA / PRÓXIMA AULA" (lê a própria grade de horários)
    // ==========================================
    const live = document.getElementById('live-status');
    if (live && schedule) {
        const days = ['no domingo', 'na segunda', 'na terça', 'na quarta', 'na quinta', 'na sexta', 'no sábado'];
        // aulas[dia] = [{ h: 18, name: 'Muay Thai' }, ...]
        const aulas = Array.from({ length: 7 }, () => []);
        const cols = [...schedule.querySelectorAll('thead th[data-day]')].map((th) => Number(th.dataset.day));
        schedule.querySelectorAll('tbody tr').forEach((tr) => {
            const h = parseInt(tr.querySelector('th').textContent, 10);
            [...tr.querySelectorAll('td')].forEach((td, i) => {
                const tag = td.querySelector('.tag:not(.tag-off)');
                if (tag && Number.isFinite(h)) aulas[cols[i]].push({ h, name: tag.textContent.trim() });
            });
        });

        const text = live.querySelector('.live-text');
        const update = () => {
            const now = new Date();
            const d = now.getDay();
            const hNow = now.getHours();
            const agora = aulas[d].find((a) => a.h === hNow);
            let msg = '';
            if (agora) {
                msg = `Aula de ${agora.name} acontecendo agora`;
            } else {
                // próxima aula hoje ou nos próximos dias
                for (let k = 0; k < 7 && !msg; k++) {
                    const dd = (d + k) % 7;
                    const prox = aulas[dd].find((a) => k > 0 || a.h > hNow);
                    if (prox) {
                        const quando = k === 0 ? 'hoje' : k === 1 ? 'amanhã' : days[dd];
                        msg = `Próxima aula: ${quando} às ${String(prox.h).padStart(2, '0')}h (${prox.name})`;
                    }
                }
            }
            if (!msg) return;
            text.textContent = msg;
            live.classList.toggle('is-live', Boolean(agora));
            live.hidden = false;
        };
        update();
        window.setInterval(update, 60000);
    }

    // ==========================================
    // CONTADOR DE CLIQUES SEM COOKIES (Umami Cloud)
    // Cole o "Website ID" do painel do Umami abaixo para ativar.
    // Vazio = nada é carregado e nenhum dado sai do site.
    // ==========================================
    const UMAMI_WEBSITE_ID = '';
    const UMAMI_SCRIPT = 'https://cloud.umami.is/script.js';

    if (/^[0-9a-f-]{36}$/i.test(UMAMI_WEBSITE_ID)) {
        const s = document.createElement('script');
        s.src = UMAMI_SCRIPT;
        s.defer = true;
        s.dataset.websiteId = UMAMI_WEBSITE_ID;
        s.dataset.doNotTrack = 'true';
        document.head.appendChild(s);
    }

    const trackEvent = (name, data) => {
        if (window.umami && typeof window.umami.track === 'function') {
            window.umami.track(name, data);
        }
    };

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href') || '';
        const origem = link.closest('section, header, footer, .mobile-cta, .floating-buttons');
        const local = origem ? (origem.id || origem.className.split(' ')[0]) : 'pagina';

        if (href.startsWith('https://wa.me/')) trackEvent('WhatsApp', { local });
        else if (href.startsWith('tel:')) trackEvent('Telefone', { local });
        else if (href.includes('instagram.com')) trackEvent('Instagram', { local });
        else if (href.includes('google.com/maps')) trackEvent('Rota no Maps', { local });
    }, { capture: true });

    // ==========================================
    // ANO AUTOMÁTICO NO RODAPÉ
    // ==========================================
    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
})();
