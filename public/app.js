/**
 * House of Tod - Interactive Web Experience JS
 * Handles Nav behaviors, Scroll reveals, AJAX dynamic API loading, Form submission, 
 * and Web Audio API (Synthesizer Engine & Live Microphone Visualizer).
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     0. VINYL RECORD PLAYER ENGINE
     ========================================================================== */
  (function initVinylPlayer() {
    const audio = document.getElementById('vinyl-audio');
    const disc = document.getElementById('hero-frog-mark');
    const oledPanel = document.getElementById('oled-turntable-display');
    const titleEl = document.getElementById('oled-track-title');
    const artistEl = document.getElementById('oled-track-artist');
    const statusEl = document.getElementById('oled-status-label');

    if (!audio) return;

    audio.loop = true;
    let currentTrack = null;
    let isPlaying = false;

    // Floating Mute / Unmute Toggle Button Handler
    const musicBtn = document.getElementById('floating-music-toggle');
    const iconUnmuted = document.getElementById('music-icon-unmuted');
    const iconMuted = document.getElementById('music-icon-muted');
    const musicText = document.getElementById('music-toggle-text');

    function updateMusicBtnUI() {
      if (!musicBtn) return;
      const isMutedOrPaused = audio.muted || audio.paused;
      if (isMutedOrPaused) {
        musicBtn.classList.add('is-muted');
        if (iconUnmuted) iconUnmuted.classList.add('hidden');
        if (iconMuted) iconMuted.classList.remove('hidden');
        if (musicText) musicText.textContent = 'MUSIC OFF';
      } else {
        musicBtn.classList.remove('is-muted');
        if (iconUnmuted) iconUnmuted.classList.remove('hidden');
        if (iconMuted) iconMuted.classList.add('hidden');
        if (musicText) musicText.textContent = 'MUSIC ON';
      }
    }

    if (musicBtn) {
      musicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (audio.paused) {
          audio.muted = false;
          audio.play().then(() => {
            isPlaying = true;
            startSpinning();
            updateMusicBtnUI();
          }).catch(err => console.warn('Play error:', err));
        } else if (audio.muted) {
          audio.muted = false;
          updateMusicBtnUI();
        } else {
          audio.muted = true;
          updateMusicBtnUI();
        }
      });
    }

    audio.addEventListener('play', updateMusicBtnUI);
    audio.addEventListener('pause', updateMusicBtnUI);
    audio.addEventListener('volumechange', updateMusicBtnUI);

    // Setup GSAP rotation tween on vinyl record disc
    let spinTween = null;
    if (disc && typeof gsap !== 'undefined') {
      spinTween = gsap.to(disc, {
        rotation: 360,
        duration: 4,
        ease: "none",
        repeat: -1,
        paused: true
      });
    }

    function updateDisplay(track) {
      if (!track) return;
      if (titleEl) titleEl.textContent = track.title || 'Background Track';
      if (artistEl) artistEl.textContent = track.artist || 'House of Tod';
    }

    function startSpinning() {
      if (disc) {
        disc.classList.remove('is-paused');
        disc.classList.add('is-playing');
        if (spinTween) {
          spinTween.play();
          gsap.killTweensOf(spinTween);
          gsap.to(spinTween, { timeScale: 1, duration: 0.5, ease: "power1.out" });
        }
      }
      if (oledPanel) oledPanel.classList.remove('is-paused');
      if (statusEl) statusEl.textContent = 'NOW PLAYING';
    }

    function playLoopTrack(track) {
      if (!track || !track.filename) return;
      currentTrack = track;
      updateDisplay(track);

      audio.src = track.filename;
      audio.loop = true;
      audio.load();

      const attemptPlay = () => {
        audio.play()
          .then(() => {
            isPlaying = true;
            startSpinning();
          })
          .catch(err => {
            console.warn('[VinylPlayer] Autoplay waiting for interaction:', err);
            if (statusEl) statusEl.textContent = 'BACKGROUND MUSIC';
          });
      };

      attemptPlay();

      // Interaction handler fallback in case browser blocks un-muted autoplay
      const handleUserInteraction = () => {
        if (!isPlaying) {
          audio.play().then(() => {
            isPlaying = true;
            startSpinning();
          }).catch(() => { });
        }
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      };

      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);
      document.addEventListener('keydown', handleUserInteraction);
    }

    /* --- Loop replay safety handler --- */
    audio.addEventListener('ended', () => {
      audio.currentTime = 0;
      audio.play().then(() => startSpinning()).catch(() => { });
    });

    audio.addEventListener('error', () => {
      console.warn('[VinylPlayer] Audio error loading track');
      if (titleEl) titleEl.textContent = 'Audio file missing';
      if (statusEl) statusEl.textContent = 'FILE NOT FOUND';
    });

    /* --- Fetch single track from /api/music --- */
    fetch('/api/music')
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(tracks => {
        if (!Array.isArray(tracks) || tracks.length === 0) {
          if (titleEl) titleEl.textContent = 'No track set';
          if (artistEl) artistEl.textContent = 'Set music via Admin';
          if (statusEl) statusEl.textContent = 'NO MUSIC';
          return;
        }
        playLoopTrack(tracks[0]);
      })
      .catch(err => {
        console.error('[VinylPlayer] Failed to load background music:', err);
        if (titleEl) titleEl.textContent = 'Music unavailable';
        if (statusEl) statusEl.textContent = 'ERROR';
      });
  })();

  /* ==========================================================================
     0.5. STUDIO SPLASH SCREEN CONTROLLER
     ========================================================================== */
  (function initSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    const enterBtn = document.getElementById('enter-studio-btn');
    const splashVideo = document.getElementById('splash-video');
    const audio = document.getElementById('vinyl-audio');

    if (!splashScreen || !enterBtn) return;

    // Ensure video is playing muted on splash screen load
    if (splashVideo) {
      splashVideo.play().catch(err => console.warn('[Splash] Video autoplay error:', err));
    }

    function dismissSplashScreen() {
      // 1. Unmute & start playing background music from Music Manager
      if (audio) {
        audio.muted = false;
        audio.play().then(() => {
          const disc = document.getElementById('hero-frog-mark');
          if (disc) disc.classList.add('is-playing');
        }).catch(err => console.warn('[Splash] Audio play on enter error:', err));
      }

      // 2. Smooth fade out splash screen overlay
      splashScreen.classList.add('fade-out');

      // 3. Pause video after fade out to optimize GPU/CPU performance
      setTimeout(() => {
        if (splashVideo) splashVideo.pause();
        splashScreen.style.display = 'none';
      }, 900);

      // 4. Refresh Lenis / GSAP smooth scroll proxy if available
      if (window.__hotMotion && window.__hotMotion.lenis) {
        window.__hotMotion.lenis.resize();
      }
    }

    enterBtn.addEventListener('click', dismissSplashScreen);
  })();

  /* ==========================================================================
     0.6. HERO VIDEO — GLITCH-FREE LOOP CONTROLLER
     ========================================================================== */
  (function initHeroVideo() {
    const video = document.getElementById('hero-bg-video');
    if (!video) return;

    // Ensure autoplay attribute is set
    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    // Start playback – safe for browsers that suspend autoplay
    const tryPlay = () => {
      video.play().catch(() => {
        // If autoplay is blocked, try again on first user interaction
        const onInteract = () => {
          video.play().catch(() => {});
          document.removeEventListener('click', onInteract);
          document.removeEventListener('touchstart', onInteract);
        };
        document.addEventListener('click', onInteract, { once: true });
        document.addEventListener('touchstart', onInteract, { once: true });
      });
    };

    tryPlay();

    // Safety net: some browsers still fire 'ended' even with loop=true
    video.addEventListener('ended', () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    });

    // Stall recovery: restart if the video freezes / stalls
    video.addEventListener('stalled', () => {
      video.load();
      tryPlay();
    });
  })();

  /* ==========================================================================
     1. Navigation and Mobile Menu
     ========================================================================== */
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const closeMenu = document.getElementById('close-menu');

  const scrollCue = document.querySelector('.scroll-cue');

  const handlePageScroll = (scrollY) => {
    if (scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }

    if (scrollCue) {
      if (scrollY > 60) {
        scrollCue.classList.add('fade-out');
      } else {
        scrollCue.classList.remove('fade-out');
      }
    }
  };

  window.addEventListener('scroll', () => handlePageScroll(window.scrollY), { passive: true });

  navToggle.addEventListener('click', () => {
    mobileMenu.classList.add('open');
    mobileMenu.setAttribute('aria-hidden', 'false');
  });

  const closeMenuFn = () => {
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
  };

  closeMenu.addEventListener('click', closeMenuFn);
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenuFn);
  });

  /* ==========================================================================
     2. Scroll Reveal Animations (Intersection Observer)
     ========================================================================== */
  const revealEls = document.querySelectorAll('.reveal');
  const observerOptions = {
    root: null,
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const initScrollReveals = () => {
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
  };
  initScrollReveals();

  /* ==========================================================================
     3. Toast Notification Helper
     ========================================================================== */
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    // Auto-remove toast
    setTimeout(() => {
      toast.style.animation = 'toastFadeIn 0.3s reverse forwards';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4000);
  }

  /* ==========================================================================
     3.5. Start a Project Modal Popup Control
     ========================================================================== */
  const projectModal = document.getElementById('project-modal');
  const projectModalClose = document.getElementById('project-modal-close');
  const projectModalBackdrop = document.getElementById('project-modal-backdrop');
  const modalForm = document.getElementById('modal-project-form');
  const modalStatusMsg = document.getElementById('modal-status-msg');
  const modalSubmitBtn = document.getElementById('modal-form-submit');

  function openProjectModal(e) {
    if (e) e.preventDefault();
    if (projectModal) {
      projectModal.classList.add('active');
      projectModal.setAttribute('aria-hidden', 'false');
      if (window.__hotMotion && window.__hotMotion.pauseScroll) window.__hotMotion.pauseScroll();
    }
  }

  function closeProjectModal() {
    if (projectModal) {
      projectModal.classList.remove('active');
      projectModal.setAttribute('aria-hidden', 'true');
      if (window.__hotMotion && window.__hotMotion.resumeScroll) window.__hotMotion.resumeScroll();
    }
  }

  if (projectModalClose) projectModalClose.addEventListener('click', closeProjectModal);
  if (projectModalBackdrop) projectModalBackdrop.addEventListener('click', closeProjectModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && projectModal && projectModal.classList.contains('active')) {
      closeProjectModal();
    }
  });

  // Attach modal trigger to all "Start a Project" buttons dynamically
  document.addEventListener('click', (e) => {
    const target = e.target.closest('#start-project-nav-btn, #start-project-mobile-btn, #hero-cta-start, .project-cta-btn');
    if (target) {
      openProjectModal(e);
    }
  });

  if (modalForm) {
    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('modal-name').value.trim();
      const email = document.getElementById('modal-email').value.trim();
      const phone = document.getElementById('modal-phone').value.trim();
      const service = document.getElementById('modal-service').value;
      const messageRaw = document.getElementById('modal-message').value.trim();

      const message = service ? `[Service Category: ${service}]\n${messageRaw}` : messageRaw;

      modalStatusMsg.className = 'form-status';
      modalStatusMsg.style.display = 'none';

      if (!name || !email || !messageRaw) {
        modalStatusMsg.innerText = 'Please fill out all required fields (*).';
        modalStatusMsg.classList.add('error');
        modalStatusMsg.style.display = 'block';
        showToast('Please complete required fields.', 'error');
        return;
      }

      modalSubmitBtn.disabled = true;
      modalSubmitBtn.innerText = 'Submitting...';

      fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message })
      })
        .then(res => res.json())
        .then(data => {
          modalSubmitBtn.disabled = false;
          modalSubmitBtn.innerText = 'Submit Project Brief';
          if (data.success) {
            modalStatusMsg.innerText = 'Thank you! Your project brief was submitted successfully.';
            modalStatusMsg.classList.add('success');
            modalStatusMsg.style.display = 'block';
            modalForm.reset();
            showToast('Project brief sent! We will contact you soon.');
            setTimeout(closeProjectModal, 2500);
          } else {
            modalStatusMsg.innerText = data.error || 'Failed to submit project brief.';
            modalStatusMsg.classList.add('error');
            modalStatusMsg.style.display = 'block';
          }
        })
        .catch(err => {
          modalSubmitBtn.disabled = false;
          modalSubmitBtn.innerText = 'Submit Project Brief';
          modalStatusMsg.innerText = 'Connection error. Please try again.';
          modalStatusMsg.classList.add('error');
          modalStatusMsg.style.display = 'block';
        });
    });
  }

  /* ==========================================================================
     4. Dynamic Content Loading (AJAX API Fetching)
     ========================================================================== */

  // Load General Studio Info
  fetch('/api/studio-info')
    .then(res => res.json())
    .then(data => {
      if (data) {
        // About Section
        if (data.bio_title) document.getElementById('about-bio-title').innerText = data.bio_title;
        if (data.bio_text) document.getElementById('about-bio-text').innerText = data.bio_text;
        if (data.quote_text) document.getElementById('about-quote-text').innerText = `"${data.quote_text.replace(/\"/g, '')}"`;
        if (data.quote_author) document.getElementById('about-quote-author').innerText = `— ${data.quote_author}`;

        // Founder Details
        if (data.founder_photo) {
          const founderImg = document.getElementById('founder-photo-img');
          if (founderImg) founderImg.src = data.founder_photo;
        }
        if (data.founder_name) {
          const nameEl = document.getElementById('founder-name-text');
          if (nameEl) nameEl.innerText = data.founder_name;
        }
        if (data.founder_role) {
          const roleEl = document.getElementById('founder-role-text');
          if (roleEl) roleEl.innerText = data.founder_role;
        }
        if (data.founder_portfolio) {
          const wrap = document.getElementById('founder-portfolio-wrap');
          const link = document.getElementById('founder-portfolio-link');
          if (wrap && link) {
            link.href = data.founder_portfolio;
            wrap.style.display = 'block';
          }
        }

        // Contact Coordinates
        const addressEl = document.getElementById('contact-address');
        if (addressEl && data.address) addressEl.innerText = data.address;
        const emailLink = document.getElementById('email-link');
        if (emailLink && data.email) {
          emailLink.innerText = data.email;
          emailLink.href = `mailto:${data.email}`;
        }
        const phone1El = document.getElementById('phone-link-1');
        if (phone1El && (data.phone_1 || data.phone_2)) {
          const phoneContainer = phone1El.parentElement;
          phoneContainer.innerHTML = ''; // reset phone displays
          if (data.phone_1) {
            phoneContainer.innerHTML += `<a href="tel:${data.phone_1.replace(/\s+/g, '')}" id="phone-link-1">${data.phone_1}</a>`;
          }
          if (data.phone_2) {
            phoneContainer.innerHTML += `<br><a href="tel:${data.phone_2.replace(/\s+/g, '')}" id="phone-link-2">${data.phone_2}</a>`;
          }
        }
      }
    })
    .catch(err => console.error("Error fetching studio-info:", err));

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Service card click & keyboard toggle listener to reveal description
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.svc-card');
    if (card) {
      const isExpanded = card.classList.contains('active');
      card.classList.toggle('active');
      card.setAttribute('aria-expanded', !isExpanded);
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('svc-card')) {
      e.preventDefault();
      const isExpanded = e.target.classList.contains('active');
      e.target.classList.toggle('active');
      e.target.setAttribute('aria-expanded', !isExpanded);
    }
  });

  // Load Services CMS data
  fetch('/api/services')
    .then(res => res.json())
    .then(services => {
      const container = document.getElementById('services-container');
      if (services && services.length > 0) {
        container.innerHTML = '';
        services.forEach(svc => {
          let svgIcon = '';
          // Check if icon is uploaded custom SVG path or preset icon name
          if (svc.icon && (svc.icon.endsWith('.svg') || svc.icon.startsWith('/uploads/'))) {
            svgIcon = `<img src="${svc.icon}" alt="${svc.title} icon" style="width:24px; height:24px; filter:invert(1);">`;
          } else if (svc.icon && svc.icon.trim().startsWith('<svg')) {
            svgIcon = svc.icon;
          } else {
            // Icon router helper
            switch (svc.icon) {
              case 'volume-2':
                svgIcon = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
                break;
              case 'activity':
                svgIcon = `<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
                break;
              case 'music':
                svgIcon = `<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>`;
                break;
              case 'film':
                svgIcon = `<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`;
                break;
              case 'sliders':
                svgIcon = `<svg viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`;
                break;
              case 'mic':
                svgIcon = `<svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>`;
                break;
              case 'disc':
                svgIcon = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`;
                break;
              case 'headphones':
                svgIcon = `<svg viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`;
                break;
              default:
                svgIcon = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
            }
          }

          const descText = svc.description ? svc.description.trim() : '';
          const descHtml = descText ? `<p class="svc-desc">${escapeHtml(descText)}</p>` : '';
          const chevronHtml = descText ? `<div class="svc-arrow"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div>` : '';

          container.innerHTML += `
            <div class="svc-card${descText ? ' has-desc' : ''}" tabindex="0" role="button" aria-expanded="false">
              <div class="svc-card-top">
                <div class="svc-icon">${svgIcon}</div>
                ${chevronHtml}
              </div>
              <h3>${escapeHtml(svc.title)}</h3>
              ${descHtml}
            </div>
          `;
        });
        initScrollReveals();
        if (window.__hotMotion && window.__hotMotion.refreshDynamic) window.__hotMotion.refreshDynamic();
      }
    })
    .catch(err => console.error("Error fetching services:", err));

  // Load Credits
  fetch('/api/credits')
    .then(res => res.json())
    .then(credits => {
      const container = document.getElementById('credits-container');
      if (credits && credits.length > 0) {
        container.innerHTML = '';
        credits.forEach(crd => {
          const awardClass = crd.award === 1 ? 'credit-chip award' : 'credit-chip';
          container.innerHTML += `<span class="${awardClass}">${crd.title} — ${crd.role}</span>`;
        });
      }
    })
    .catch(err => console.error("Error fetching credits:", err));


  // Load Projects CMS data
  fetch('/api/projects')
    .then(res => res.json())
    .then(projects => {
      const container = document.getElementById('projects-container');
      if (projects && projects.length > 0) {
        container.innerHTML = '';
        projects.forEach(proj => {
          const highlightClass = proj.highlight === 1 ? 'project-card project-card--highlight' : 'project-card';
          const tagClass = proj.highlight === 1 ? 'project-tag project-tag--award' : 'project-tag';

          let chipsHtml = '';
          if (proj.chips) {
            const chipsArr = proj.chips.split(',').map(c => c.trim()).filter(Boolean);
            if (chipsArr.length > 0) {
              chipsHtml = `<div class="project-chips">` +
                chipsArr.map(chip => `<span>${escapeHtml(chip)}</span>`).join('') +
                `</div>`;
            }
          }

          let posterHtml = '';
          if (proj.poster_url) {
            posterHtml = `
              <div class="project-poster-wrap" ${proj.music_url ? `onclick="window.open('${escapeHtml(proj.music_url)}', '_blank')"` : ''}>
                <img class="project-poster-img" src="${escapeHtml(proj.poster_url)}" alt="${escapeHtml(proj.title)} Poster" loading="lazy">
              </div>
            `;
          }

          let musicBtnHtml = '';
          if (proj.music_url) {
            musicBtnHtml = `
              <a href="${escapeHtml(proj.music_url)}" target="_blank" rel="noopener" class="project-music-btn">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.12-.779-.18-.899-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.479.659.301 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C13.68 8.4 8.16 8.22 4.98 9.18c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 3.78-1.14 9.9-.96 14.52 1.8.54.3.72.96.42 1.5-.3.54-.96.78-1.5.48z"/></svg>
                Listen on Spotify / Music
              </a>
            `;
          }

          container.innerHTML += `
            <div class="${highlightClass}">
              ${posterHtml}
              <div class="project-index">${escapeHtml(proj.project_index)}</div>
              <span class="${tagClass}">${escapeHtml(proj.tag)}</span>
              <h3>${escapeHtml(proj.title)}</h3>
              ${proj.description ? `<p>${escapeHtml(proj.description)}</p>` : ''}
              ${chipsHtml}
              ${musicBtnHtml}
            </div>
          `;
        });

        initScrollReveals();
        if (window.__hotMotion && window.__hotMotion.refreshDynamic) window.__hotMotion.refreshDynamic();
      } else {
        container.innerHTML = '';
      }
    })
    .catch(err => console.error("Error fetching projects:", err));


  /* ==========================================================================
     5. Count-Up Number Animation (triggers on scroll into view)
     ========================================================================== */
  function animateCountUp(el) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 2000;
    const startTime = performance.now();

    function easeOutExpo(t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.round(easeOutExpo(progress) * target);
      el.textContent = value + suffix;
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target + suffix;
      }
    }
    requestAnimationFrame(tick);
  }

  const countUpObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.animated) {
        entry.target.dataset.animated = 'true';
        animateCountUp(entry.target);
        countUpObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.count-up').forEach(el => countUpObserver.observe(el));


  /* ==========================================================================
     7. Contact Form Handler (AJAX Submission)
     ========================================================================== */
  const contactForm = document.getElementById('contact-form');
  const statusMsg = document.getElementById('form-status-msg');
  const submitBtn = document.getElementById('contact-form-submit');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('form-name').value.trim();
      const email = document.getElementById('form-email').value.trim();
      const phone = document.getElementById('form-phone').value.trim();
      const message = document.getElementById('form-message').value.trim();

      // Reset state
      statusMsg.className = 'form-status';
      statusMsg.style.display = 'none';

      // Simple validation
      if (!name || !email || !message) {
        statusMsg.innerText = 'Please fill out all required fields (*).';
        statusMsg.classList.add('error');
        statusMsg.style.display = 'block';
        showToast('Submission failed. Check required fields.', 'error');
        return;
      }

      // Disable submit during upload
      submitBtn.disabled = true;
      submitBtn.innerText = 'Sending Message...';

      fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, phone, message })
      })
        .then(res => res.json())
        .then(data => {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Send Message';

          if (data.success) {
            statusMsg.innerText = 'Thank you! Your message was sent successfully.';
            statusMsg.classList.add('success');
            statusMsg.style.display = 'block';
            contactForm.reset();
            showToast('Message sent! We will contact you soon.');
          } else {
            statusMsg.innerText = data.error || 'Failed to send message. Please try again.';
            statusMsg.classList.add('error');
            statusMsg.style.display = 'block';
            showToast('Failed to send message.', 'error');
          }
        })
        .catch(err => {
          console.error("Contact Form submission error:", err);
          submitBtn.disabled = false;
          submitBtn.innerText = 'Send Message';
          statusMsg.innerText = 'A network error occurred. Please try again.';
          statusMsg.classList.add('error');
          statusMsg.style.display = 'block';
          showToast('Connection error.', 'error');
        });
    });
  }

  /* ==========================================================================
     8. Lenis + GSAP Motion Layer (enhancement — keeps existing logic intact)
     ========================================================================== */
  (function initPremiumMotion() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      document.body.classList.remove('is-loading');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add('has-motion');
    document.body.classList.add('is-loading');
    gsap.set(document.body, { opacity: 0 });

    let lenis = null;
    if (typeof Lenis !== 'undefined') {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.2
      });

      lenis.on('scroll', ({ scroll }) => {
        handlePageScroll(scroll);
        ScrollTrigger.update();
      });

      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);

      ScrollTrigger.scrollerProxy(document.documentElement, {
        scrollTop(value) {
          if (arguments.length) {
            lenis.scrollTo(value, { immediate: true });
          }
          return lenis.scroll;
        },
        getBoundingClientRect() {
          return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
        },
        pinType: document.body.style.transform ? 'transform' : 'fixed'
      });
    }

    const motion = {
      lenis,
      pauseScroll() {
        if (lenis) lenis.stop();
      },
      resumeScroll() {
        if (lenis) lenis.start();
      },
      refreshHeroTitle: null,
      refreshDynamic: null
    };
    window.__hotMotion = motion;

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (!href || href.length < 2) return;
        const target = document.querySelector(href);
        if (target && lenis) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -92, duration: 1.2 });
        }
      });
    });

    function wrapHeroTitleLines() {
      const titleEl = document.getElementById('hero-title');
      if (!titleEl || titleEl.dataset.linesWrapped === '1') return;
      const html = titleEl.innerHTML;
      const parts = html.split(/<br\s*\/?>/i);
      titleEl.innerHTML = parts.map((part) =>
        `<span class="hero-line"><span class="hero-line-inner">${part.trim()}</span></span>`
      ).join('');
      titleEl.dataset.linesWrapped = '1';
    }

    function splitSectionHeadings() {
      document.querySelectorAll('.section-head h2').forEach((h2) => {
        if (h2.dataset.split === '1') return;
        const html = h2.innerHTML;
        const parts = html.split(/<br\s*\/?>/i);
        if (parts.length <= 1) {
          h2.dataset.split = '1';
          return;
        }
        h2.innerHTML = parts.map((part) =>
          `<span class="head-line"><span class="head-line-inner">${part.trim()}</span></span>`
        ).join('');
        h2.dataset.split = '1';
      });
    }

    wrapHeroTitleLines();
    splitSectionHeadings();
    motion.refreshHeroTitle = () => {
      const titleEl = document.getElementById('hero-title');
      if (titleEl) delete titleEl.dataset.linesWrapped;
      wrapHeroTitleLines();
    };

    const introTargets = {
      nav: document.getElementById('nav'),
      logo: document.querySelector('.nav-logo img'),
      links: document.querySelectorAll('#desktop-links a'),
      navCta: document.querySelector('.nav-cta .btn'),
      heroMark: document.getElementById('hero-frog-mark'),
      heroEyebrow: document.getElementById('hero-eyebrow'),
      heroLines: () => document.querySelectorAll('#hero-title .hero-line-inner'),
      heroSub: document.getElementById('hero-sub'),
      heroCredo: document.getElementById('hero-credo'),
      heroBtns: document.querySelectorAll('.hero-ctas .btn'),
      ripple: document.querySelector('.ripple-field'),
      scrollCue: document.querySelector('.scroll-cue'),
      ambient: document.querySelector('.ambient-field')
    };

    const filterValid = (target) => {
      if (!target) return null;
      if (target instanceof NodeList || Array.isArray(target)) {
        const arr = Array.from(target).filter(el => el !== null && el !== undefined);
        return arr.length > 0 ? arr : null;
      }
      return target;
    };

    const safeSet = (target, vars) => {
      const valid = filterValid(target);
      if (valid) gsap.set(valid, vars);
    };

    safeSet(introTargets.heroLines(), { yPercent: 110, opacity: 0 });
    safeSet([introTargets.heroMark, introTargets.heroEyebrow, introTargets.heroSub, introTargets.heroCredo], { y: 28, opacity: 0 });
    safeSet(introTargets.heroBtns, { y: 20, opacity: 0, scale: 0.96 });
    safeSet(introTargets.nav, { y: -24, opacity: 0 });
    safeSet(introTargets.links, { y: -12, opacity: 0 });
    safeSet(introTargets.logo, { scale: 0.85, opacity: 0, rotation: -8 });
    safeSet(introTargets.navCta, { scale: 0.9, opacity: 0 });
    safeSet(introTargets.scrollCue, { opacity: 0, y: 16 });
    safeSet(introTargets.ripple, { opacity: 0, scale: 0.92 });
    safeSet(introTargets.ambient, { opacity: 0 });

    const intro = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete() {
        document.body.classList.remove('is-loading');
      }
    });

    const safeTo = (tl, target, vars, position) => {
      const valid = filterValid(target);
      if (valid) tl.to(valid, vars, position);
    };

    safeTo(intro, document.body, { opacity: 1, duration: 0.35 }, 0);
    safeTo(intro, introTargets.nav, { y: 0, opacity: 1, duration: 0.7 }, 0.05);
    safeTo(intro, introTargets.logo, { scale: 1, opacity: 1, rotation: 0, duration: 0.75 }, 0.12);
    safeTo(intro, introTargets.links, { y: 0, opacity: 1, duration: 0.55, stagger: 0.06 }, 0.22);
    safeTo(intro, introTargets.navCta, { scale: 1, opacity: 1, duration: 0.5 }, 0.38);
    safeTo(intro, introTargets.heroMark, { y: 0, opacity: 1, duration: 0.65 }, 0.28);
    safeTo(intro, introTargets.heroEyebrow, { y: 0, opacity: 1, duration: 0.55 }, 0.42);
    safeTo(intro, introTargets.heroLines(), { yPercent: 0, opacity: 1, duration: 0.85, stagger: 0.1 }, 0.48);
    safeTo(intro, introTargets.heroSub, { y: 0, opacity: 1, duration: 0.6 }, 0.72);
    safeTo(intro, introTargets.heroCredo, { y: 0, opacity: 1, duration: 0.55 }, 0.82);
    safeTo(intro, introTargets.heroBtns, { y: 0, opacity: 1, scale: 1, duration: 0.55, stagger: 0.08 }, 0.9);
    safeTo(intro, introTargets.ripple, { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out' }, 0.35);
    safeTo(intro, introTargets.ambient, { opacity: 1, duration: 1.1 }, 0.2);
    safeTo(intro, introTargets.scrollCue, { opacity: 1, y: 0, duration: 0.6 }, 1.05);

    /* Hero subtle parallax (max 15px) */
    const heroInner = document.querySelector('.hero-inner');
    if (heroInner) {
      window.addEventListener('mousemove', (e) => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        gsap.to(heroInner, { x: nx * 8, y: ny * 6, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
        if (introTargets.ripple) {
          gsap.to(introTargets.ripple, { x: nx * -12, y: ny * -10, duration: 1, ease: 'power2.out', overwrite: 'auto' });
        }
      }, { passive: true });
    }

    /* Section scroll choreography (unique per block) */
    const registerRevealEnhancements = () => {
      document.querySelectorAll('.section-head h2 .head-line-inner').forEach((line) => {
        if (line.dataset.stRegistered) return;
        line.dataset.stRegistered = '1';
        gsap.from(line, {
          scrollTrigger: {
            trigger: line.closest('.section-head') || line,
            start: 'top 82%',
            toggleActions: 'play none none reverse'
          },
          yPercent: 100,
          opacity: 0,
          duration: 0.9,
          ease: 'power4.out'
        });
      });

      const statGrid = document.querySelector('#about .stat-grid');
      if (statGrid && !statGrid.dataset.stRegistered) {
        const statCards = statGrid.querySelectorAll('.stat-card');
        if (statCards.length > 0) {
          statGrid.dataset.stRegistered = '1';
          gsap.from(statCards, {
            scrollTrigger: { trigger: statGrid, start: 'top 92%' },
            y: 28,
            scale: 0.98,
            duration: 0.45,
            stagger: 0.05,
            ease: 'power3.out',
            clearProps: 'transform'
          });
        }
      }

      gsap.utils.toArray('.pull-quote').forEach((quote) => {
        if (quote.dataset.stRegistered) return;
        quote.dataset.stRegistered = '1';
        gsap.from(quote, {
          scrollTrigger: { trigger: quote, start: 'top 85%' },
          clipPath: 'inset(0 100% 0 0)',
          opacity: 0,
          duration: 1.1,
          ease: 'power3.inOut'
        });
      });

      gsap.utils.toArray('.chips-row .chip').forEach((chip, i) => {
        if (chip.dataset.stRegistered) return;
        chip.dataset.stRegistered = '1';
        gsap.from(chip, {
          scrollTrigger: { trigger: chip, start: 'top 90%' },
          opacity: 0,
          y: 32,
          scale: 0.9,
          duration: 0.7,
          ease: 'power4.out',
          delay: i * 0.07
        });
      });

      gsap.utils.toArray('.svc-card').forEach((card, i) => {
        if (card.dataset.stRegistered) return;
        card.dataset.stRegistered = '1';
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: 'top 92%' },
          opacity: 0,
          y: 40,
          rotateX: 8,
          transformPerspective: 800,
          duration: 0.75,
          ease: 'power4.out',
          delay: (i % 4) * 0.06
        });
      });

      gsap.utils.toArray('.proc-step').forEach((step, i) => {
        if (step.dataset.stRegistered) return;
        step.dataset.stRegistered = '1';
        gsap.from(step, {
          scrollTrigger: { trigger: step, start: 'top 92%' },
          opacity: 0,
          y: 40,
          scale: 0.94,
          duration: 0.85,
          ease: 'power4.out',
          delay: i * 0.1
        });
      });

      const processWavePath = document.querySelector('.process-wave path');
      if (processWavePath && !processWavePath.dataset.stRegistered) {
        processWavePath.dataset.stRegistered = '1';
        gsap.from(processWavePath, {
          scrollTrigger: { trigger: '.process-wrap', start: 'top 82%' },
          strokeDashoffset: 800,
          opacity: 0,
          duration: 1.2,
          ease: 'power2.inOut'
        });
      }

      const contactGrid = document.querySelector('#contact .contact-grid');
      if (contactGrid && !contactGrid.dataset.stRegistered) {
        const contactCards = contactGrid.querySelectorAll('.contact-card');
        if (contactCards.length > 0) {
          contactGrid.dataset.stRegistered = '1';
          gsap.from(contactCards, {
            scrollTrigger: { trigger: contactGrid, start: 'top 92%' },
            y: 24,
            scale: 0.98,
            stagger: 0.06,
            duration: 0.4,
            ease: 'power3.out',
            clearProps: 'transform'
          });
        }
      }

      gsap.utils.toArray('.why-card').forEach((card, i) => {
        if (card.dataset.stRegistered) return;
        card.dataset.stRegistered = '1';
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: 'top 90%' },
          opacity: 0,
          x: i % 2 ? 40 : -40,
          duration: 0.85,
          ease: 'power4.out'
        });
      });

      gsap.utils.toArray('.project-card').forEach((card, i) => {
        if (card.dataset.stRegistered) return;
        card.dataset.stRegistered = '1';
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: 'top 90%' },
          opacity: 0,
          y: 56,
          scale: 0.96,
          duration: 0.85,
          ease: 'power4.out',
          delay: (i % 3) * 0.05
        });
        const poster = card.querySelector('.project-poster-img');
        if (poster) {
          gsap.to(poster, {
            scrollTrigger: {
              trigger: card,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6
            },
            scale: 1.08,
            ease: 'none'
          });
        }
      });

      const founderPhoto = document.querySelector('.founder-photo-wrap');
      if (founderPhoto && !founderPhoto.dataset.stRegistered) {
        founderPhoto.dataset.stRegistered = '1';
        gsap.from(founderPhoto, {
          scrollTrigger: { trigger: founderPhoto, start: 'top 85%' },
          opacity: 0,
          scale: 0.92,
          rotate: -3,
          duration: 1,
          ease: 'power4.out'
        });
        gsap.to(founderPhoto, {
          scrollTrigger: {
            trigger: founderPhoto,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5
          },
          y: -24,
          ease: 'none'
        });
      }

      gsap.utils.toArray('.soon-card').forEach((card, i) => {
        if (card.dataset.stRegistered) return;
        card.dataset.stRegistered = '1';
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: 'top 92%' },
          opacity: 0,
          y: 36,
          rotate: i === 1 ? 2 : -2,
          duration: 0.8,
          ease: 'power4.out',
          delay: i * 0.1
        });
      });

      const footer = document.querySelector('footer');
      if (footer && !footer.dataset.stRegistered) {
        const footEls = footer.querySelectorAll('.foot-logo, .foot-right');
        if (footEls.length > 0) {
          footer.dataset.stRegistered = '1';
          gsap.from(footEls, {
            scrollTrigger: { trigger: footer, start: 'top 92%' },
            opacity: 0,
            y: 24,
            stagger: 0.12,
            duration: 0.8,
            ease: 'power4.out'
          });
        }
      }
    };

    registerRevealEnhancements();
    motion.refreshDynamic = () => {
      splitSectionHeadings();
      registerRevealEnhancements();
      initInteractiveHovers();
      ScrollTrigger.refresh();
    };

    /* GSAP hover: scale, lift, glow (native OS cursor preserved) */
    function initInteractiveHovers() {
      if (!window.matchMedia('(pointer: fine)').matches) return;

      const glowDark = '0 22px 50px rgba(221, 75, 57, 0.24)';
      const glowLight = '0 18px 42px rgba(221, 75, 57, 0.14)';
      const glowBtnFill = '0 16px 36px rgba(221, 75, 57, 0.48)';
      const glowBtnFillRest = '0 4px 20px rgba(221, 75, 57, 0.25)';
      const glowBtnOutline = '0 12px 30px rgba(221, 75, 57, 0.12)';
      const shadowNone = '0 0 0 rgba(0, 0, 0, 0)';

      document.querySelectorAll('.svc-card, .project-card, .why-card, .soon-card, .stat-card, .contact-card').forEach((card) => {
        if (card.dataset.hoverBound) return;
        card.dataset.hoverBound = '1';
        const glow = card.closest('.section.light') ? glowLight : glowDark;

        card.addEventListener('mouseenter', () => {
          gsap.to(card, {
            scale: 1.02,
            y: -8,
            boxShadow: glow,
            duration: 0.38,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        });
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(card, {
            rotateY: px * 6,
            rotateX: -py * 6,
            transformPerspective: 900,
            duration: 0.35,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            scale: 1,
            y: 0,
            rotateX: 0,
            rotateY: 0,
            boxShadow: shadowNone,
            duration: 0.5,
            ease: 'power3.out',
            overwrite: 'auto'
          });
        });
      });

      document.querySelectorAll('.btn').forEach((btn) => {
        if (btn.dataset.hoverBound) return;
        btn.dataset.hoverBound = '1';
        const isFill = btn.classList.contains('btn-fill');

        if (isFill) {
          btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            gsap.to(btn, { x: x * 0.18, y: y * 0.22, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
          });
          btn.addEventListener('mousedown', () => {
            gsap.to(btn, { scale: 0.96, duration: 0.12, ease: 'power2.out', overwrite: 'auto' });
          });
          btn.addEventListener('mouseup', () => {
            gsap.to(btn, { scale: 1.03, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
          });
        }

        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, {
            scale: isFill ? 1.03 : 1.02,
            y: -3,
            boxShadow: isFill ? glowBtnFill : glowBtnOutline,
            duration: 0.32,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, {
            scale: 1,
            x: 0,
            y: 0,
            boxShadow: isFill ? glowBtnFillRest : shadowNone,
            duration: 0.45,
            ease: isFill ? 'elastic.out(1, 0.65)' : 'power3.out',
            overwrite: 'auto'
          });
        });
      });

      document.querySelectorAll('#desktop-links a, #mobile-menu a:not(.btn)').forEach((link) => {
        if (link.dataset.hoverBound) return;
        link.dataset.hoverBound = '1';
        link.addEventListener('mouseenter', () => {
          gsap.to(link, { y: -2, opacity: 1, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
        });
        link.addEventListener('mouseleave', () => {
          gsap.to(link, { y: 0, duration: 0.32, ease: 'power2.out', overwrite: 'auto' });
        });
      });

      document.querySelectorAll('.chip, .credit-chip, .project-music-btn').forEach((el) => {
        if (el.dataset.hoverBound) return;
        el.dataset.hoverBound = '1';
        el.addEventListener('mouseenter', () => {
          gsap.to(el, { scale: 1.04, y: -2, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
        });
        el.addEventListener('mouseleave', () => {
          gsap.to(el, { scale: 1, y: 0, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
        });
      });

      document.querySelectorAll('.project-poster-wrap, .founder-photo-wrap').forEach((el) => {
        if (el.dataset.hoverBound) return;
        el.dataset.hoverBound = '1';
        const img = el.querySelector('img');
        el.addEventListener('mouseenter', () => {
          gsap.to(el, { scale: 1.02, y: -4, boxShadow: glowDark, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
          if (img) gsap.to(img, { scale: 1.06, duration: 0.55, ease: 'power2.out', overwrite: 'auto' });
        });
        el.addEventListener('mouseleave', () => {
          gsap.to(el, { scale: 1, y: 0, boxShadow: shadowNone, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
          if (img) gsap.to(img, { scale: 1, duration: 0.45, ease: 'power2.out', overwrite: 'auto' });
        });
      });
    }
    initInteractiveHovers();

    /* Active nav section indicator */
    const sectionIds = ['about', 'services', 'process', 'projects', 'founder', 'contact'];
    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      const link = document.querySelector(`#desktop-links a[href="#${id}"]`);
      if (!section || !link) return;
      ScrollTrigger.create({
        trigger: section,
        start: 'top 55%',
        end: 'bottom 45%',
        onToggle: (self) => {
          link.classList.toggle('is-active', self.isActive);
        }
      });
    });

    /* Ambient blob drift */
    gsap.to('.ambient-blob--1', {
      x: 40,
      y: -30,
      duration: 14,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
    gsap.to('.ambient-blob--2', {
      x: -35,
      y: 25,
      duration: 18,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    ScrollTrigger.addEventListener('refresh', () => {
      if (lenis) lenis.resize();
    });
    window.addEventListener('load', () => ScrollTrigger.refresh());
  })();

});
