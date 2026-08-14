/**
* House of Tod - Admin CMS Dashboard Control Script
* Manages admin session, tab toggles, form posts, file uploads, and CRUD endpoints via AJAX.
*/

document.addEventListener('DOMContentLoaded', () => {

  // Global Session Check & API Helper with 401 Interceptor
  let currentSession = null;

  function fetchWithAuth(url, options = {}) {
    return fetch(url, options).then(res => {
      if (res.status === 401) {
        showAdminToast("Session expired / Unauthorized. Redirecting to login...", "error");
        setTimeout(() => {
          window.location.href = '/admin/login.html';
        }, 1500);
        throw new Error("Unauthorized");
      }
      return res;
    });
  }

  function checkSession() {
    fetch('/api/session')
      .then(res => res.json())
      .then(data => {
        if (!data.loggedIn) {
          window.location.href = '/admin/login.html';
          return;
        }
        currentSession = data.user;
        const userEl = document.getElementById('logged-user-display');
        if (userEl) userEl.innerText = data.user.username;
        loadPanelData('panel-general');
      })
      .catch(err => {
        console.error("Session check error:", err);
        window.location.href = '/admin/login.html';
      });
  }

  checkSession();

  /* ==========================================================================
     1. Toast Notification System
     ========================================================================== */
  const adminToastContainer = document.getElementById('admin-toast-container');

  function showAdminToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    adminToastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'adminToastFadeIn 0.3s reverse forwards';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4000);
  }

  /* ==========================================================================
     2. Tab Panel Navigation Switcher
     ========================================================================== */
  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.db-panel');
  const panelTitleEl = document.getElementById('current-panel-title');
  const sidebar = document.getElementById('db-sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== sidebarToggle) {
        sidebar.classList.remove('open');
      }
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPanelId = btn.getAttribute('data-panel');

      tabButtons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetEl = document.getElementById(targetPanelId);
      if (targetEl) targetEl.classList.add('active');

      if (panelTitleEl) {
        switch (targetPanelId) {
          case 'panel-general':
            panelTitleEl.innerText = "General & About Info";
            break;
          case 'panel-services':
            panelTitleEl.innerText = "Services CMS Control";
            break;
          case 'panel-projects':
            panelTitleEl.innerText = "Music & Projects Catalog";
            break;
          case 'panel-music':
            panelTitleEl.innerText = "Background Music Playlist Manager";
            break;
          case 'panel-founder':
            panelTitleEl.innerText = "Founder Info & Portfolio";
            break;
          case 'panel-credits':
            panelTitleEl.innerText = "Credits & Highlights CMS";
            break;
          case 'panel-inquiries':
            panelTitleEl.innerText = "Client Inquiries Inbox";
            break;
        }
      }

      if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
      }

      loadPanelData(targetPanelId);
    });
  });

  function loadPanelData(panelId) {
    refreshUnreadBadge();

    switch (panelId) {
      case 'panel-general':
        loadGeneralInfo();
        break;
      case 'panel-services':
        loadServices();
        break;
      case 'panel-projects':
        loadProjects();
        break;
      case 'panel-music':
        loadMusicTracks();
        break;

      case 'panel-founder':
        loadFounderInfo();
        break;
      case 'panel-credits':
        loadCredits();
        break;
      case 'panel-inquiries':
        loadInquiries();
        break;
    }
  }

  function refreshUnreadBadge() {
    fetchWithAuth('/api/inquiries')
      .then(res => res.json())
      .then(inquiries => {
        if (!Array.isArray(inquiries)) return;
        const unread = inquiries.filter(i => i.status === 'unread');
        const badge = document.getElementById('unread-count-badge');
        if (badge) {
          if (unread.length > 0) {
            badge.innerText = unread.length;
            badge.style.display = 'inline-block';
          } else {
            badge.style.display = 'none';
          }
        }
      })
      .catch(err => console.error("Error updating unread badge:", err));
  }

  /* ==========================================================================
     3. FILE UPLOAD HELPER FUNCTION
     ========================================================================== */
  function uploadFile(fileInput, statusEl, callback) {
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      showAdminToast("Please select a file to upload.", "error");
      return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    if (statusEl) statusEl.innerText = "Uploading file...";

    fetchWithAuth('/api/upload', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.url) {
          if (statusEl) statusEl.innerText = `Uploaded: ${data.filename}`;
          showAdminToast("File uploaded successfully!");
          callback(data.url);
        } else {
          if (statusEl) statusEl.innerText = "Upload failed.";
          showAdminToast(data.error || "File upload failed.", "error");
        }
      })
      .catch(err => {
        console.error("Upload error:", err);
        if (statusEl) statusEl.innerText = "Network error during upload.";
        showAdminToast("Connection error uploading file.", "error");
      });
  }

  /* ==========================================================================
     4. GENERAL & ABOUT INFO CMS
     ========================================================================== */
  const generalForm = document.getElementById('general-info-form');

  function loadGeneralInfo() {
    fetch('/api/studio-info')
      .then(res => res.json())
      .then(data => {
        if (data) {

          if (document.getElementById('gen-bio-title')) document.getElementById('gen-bio-title').value = data.bio_title || '';
          if (document.getElementById('gen-bio-text')) document.getElementById('gen-bio-text').value = data.bio_text || '';
          if (document.getElementById('gen-quote-text')) document.getElementById('gen-quote-text').value = data.quote_text || '';
          if (document.getElementById('gen-quote-author')) document.getElementById('gen-quote-author').value = data.quote_author || '';
          if (document.getElementById('gen-email')) document.getElementById('gen-email').value = data.email || '';
          if (document.getElementById('gen-phone-1')) document.getElementById('gen-phone-1').value = data.phone_1 || '';
          if (document.getElementById('gen-phone-2')) document.getElementById('gen-phone-2').value = data.phone_2 || '';
          if (document.getElementById('gen-address')) document.getElementById('gen-address').value = data.address || '';
        }
      })
      .catch(err => {
        console.error("General info load failed:", err);
        showAdminToast("Failed to load studio details.", "error");
      });
  }

  if (generalForm) {
    generalForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const payload = {
        bio_title: document.getElementById('gen-bio-title').value,
        bio_text: document.getElementById('gen-bio-text').value,
        quote_text: document.getElementById('gen-quote-text').value,
        quote_author: document.getElementById('gen-quote-author').value,
        email: document.getElementById('gen-email').value,
        phone_1: document.getElementById('gen-phone-1').value,
        phone_2: document.getElementById('gen-phone-2').value,
        address: document.getElementById('gen-address').value
      };

      fetchWithAuth('/api/studio-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showAdminToast("Studio general & about info saved successfully!");
          } else {
            showAdminToast(data.error || "Failed to save info.", "error");
          }
        })
        .catch(err => {
          console.error(err);
          showAdminToast("Connection error while saving info.", "error");
        });
    });
  }

  /* ==========================================================================
     5. FOUNDER INFO & PORTFOLIO CMS
     ========================================================================== */
  const founderForm = document.getElementById('founder-info-form');
  const btnUploadFounderPhoto = document.getElementById('btn-upload-founder-photo');
  const founderPhotoFileInput = document.getElementById('founder-photo-file');
  const founderPhotoStatus = document.getElementById('founder-photo-status');
  const founderPhotoUrlInput = document.getElementById('founder-photo-url');

  if (btnUploadFounderPhoto) {
    btnUploadFounderPhoto.addEventListener('click', () => {
      uploadFile(founderPhotoFileInput, founderPhotoStatus, (url) => {
        if (founderPhotoUrlInput) founderPhotoUrlInput.value = url;
      });
    });
  }

  function loadFounderInfo() {
    fetch('/api/studio-info')
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (document.getElementById('founder-name')) document.getElementById('founder-name').value = data.founder_name || 'Karan Aherewal';
          if (document.getElementById('founder-role')) document.getElementById('founder-role').value = data.founder_role || 'Founder, House of Tod';
          if (document.getElementById('founder-portfolio')) document.getElementById('founder-portfolio').value = data.founder_portfolio || '';
          if (founderPhotoUrlInput) founderPhotoUrlInput.value = data.founder_photo || '';
        }
      })
      .catch(err => console.error("Error loading founder info:", err));
  }

  if (founderForm) {
    founderForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Fetch existing studio info first to merge founder fields
      fetch('/api/studio-info')
        .then(res => res.json())
        .then(info => {
          const payload = {
            ...info,
            founder_name: document.getElementById('founder-name').value.trim(),
            founder_role: document.getElementById('founder-role').value.trim(),
            founder_portfolio: document.getElementById('founder-portfolio').value.trim(),
            founder_photo: founderPhotoUrlInput.value.trim()
          };

          fetchWithAuth('/api/studio-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                showAdminToast("Founder details & portfolio link saved!");
              } else {
                showAdminToast(data.error || "Failed to save founder info.", "error");
              }
            })
            .catch(err => showAdminToast("Network error saving founder info.", "error"));
        });
    });
  }

  /* ==========================================================================
     6. SERVICES CMS CONTROL (WITH SVG FILE UPLOAD)
     ========================================================================== */
  const serviceForm = document.getElementById('service-editor-form');
  const serviceFormTitle = document.getElementById('service-form-title');
  const serviceSubmitBtn = document.getElementById('btn-save-service');
  const serviceIdInput = document.getElementById('service-id');
  const servicesList = document.getElementById('services-list-container');
  const resetServiceBtn = document.getElementById('btn-reset-service');
  const btnUploadSvg = document.getElementById('btn-upload-svg');
  const serviceSvgFileInput = document.getElementById('service-svg-file');
  const svgUploadStatus = document.getElementById('svg-upload-status');
  const serviceIconSelect = document.getElementById('service-icon');

  if (btnUploadSvg) {
    btnUploadSvg.addEventListener('click', () => {
      uploadFile(serviceSvgFileInput, svgUploadStatus, (url) => {
        // Add custom SVG option to select and highlight it
        const customOpt = document.createElement('option');
        customOpt.value = url;
        customOpt.innerText = `Custom Uploaded SVG (${url.split('/').pop()})`;
        serviceIconSelect.appendChild(customOpt);
        serviceIconSelect.value = url;
      });
    });
  }

  function loadServices() {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        servicesList.innerHTML = '';
        if (data.length === 0) {
          servicesList.innerHTML = '<p style="color:var(--text-dim); text-align:center;">No services configured yet.</p>';
          return;
        }
        data.forEach(svc => {
          servicesList.innerHTML += `
            <div class="crud-item">
              <div class="crud-details">
                <h4>${escapeHtml(svc.title)}</h4>
                <p>Icon: ${escapeHtml(svc.icon)} ${svc.description ? '| ' + escapeHtml(svc.description.slice(0, 50)) + '...' : ''}</p>
              </div>
              <div class="crud-actions">
                <button class="btn-edit" onclick="editService('${svc.id}', '${escapeHtml(svc.title)}', '${escapeHtml(svc.description || '')}', '${escapeHtml(svc.icon)}')">Edit</button>
                <button class="btn-delete" onclick="deleteService('${svc.id}')">Delete</button>
              </div>
            </div>
          `;
        });
      })
      .catch(err => console.error("Error loading services:", err));
  }

  window.editService = function (id, title, description, icon) {
    serviceIdInput.value = id;
    document.getElementById('service-title').value = title;
    document.getElementById('service-desc').value = description;

    // Check if icon exists in options, else create dynamic option
    let exists = false;
    for (let opt of serviceIconSelect.options) {
      if (opt.value === icon) exists = true;
    }
    if (!exists && icon) {
      const customOpt = document.createElement('option');
      customOpt.value = icon;
      customOpt.innerText = `Custom Icon (${icon.split('/').pop()})`;
      serviceIconSelect.appendChild(customOpt);
    }
    serviceIconSelect.value = icon;

    serviceFormTitle.innerText = "Edit Service Details";
    serviceSubmitBtn.innerText = "Update Service";
  };

  function resetServiceForm() {
    serviceIdInput.value = '';
    if (serviceForm) serviceForm.reset();
    serviceFormTitle.innerText = "Add New Service";
    serviceSubmitBtn.innerText = "Add Service";
    if (svgUploadStatus) svgUploadStatus.innerText = '';
  }

  if (resetServiceBtn) resetServiceBtn.addEventListener('click', resetServiceForm);

  if (serviceForm) {
    serviceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = serviceIdInput.value;
      const title = document.getElementById('service-title').value.trim();
      const description = document.getElementById('service-desc').value.trim();
      const icon = serviceIconSelect.value;

      fetchWithAuth('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id || undefined, title, description, icon })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showAdminToast(id ? "Service updated successfully!" : "New service added!");
            resetServiceForm();
            loadServices();
          } else {
            showAdminToast(data.error || "Failed to save service.", "error");
          }
        })
        .catch(err => showAdminToast("Network error saving service.", "error"));
    });
  }

  window.deleteService = function (id) {
    if (confirm("Are you sure you want to delete this service?")) {
      fetchWithAuth(`/api/services/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showAdminToast("Service removed successfully.");
            loadServices();
          } else {
            showAdminToast("Failed to delete service.", "error");
          }
        })
        .catch(err => showAdminToast("Network error deleting service.", "error"));
    }
  };

  /* ==========================================================================
     7. PROJECTS CMS CONTROL (WITH MUSIC URL & POSTER UPLOAD)
     ========================================================================== */
  const projectForm = document.getElementById('project-editor-form');
  const projectFormTitle = document.getElementById('project-form-title');
  const projectSubmitBtn = document.getElementById('btn-save-project');
  const projectIdInput = document.getElementById('project-id');
  const projectsList = document.getElementById('projects-list-container');
  const resetProjectBtn = document.getElementById('btn-reset-project');
  const btnUploadPoster = document.getElementById('btn-upload-poster');
  const projectPosterFileInput = document.getElementById('project-poster-file');
  const posterUploadStatus = document.getElementById('poster-upload-status');
  const projectPosterUrlInput = document.getElementById('project-poster-url');

  if (btnUploadPoster) {
    btnUploadPoster.addEventListener('click', () => {
      uploadFile(projectPosterFileInput, posterUploadStatus, (url) => {
        if (projectPosterUrlInput) projectPosterUrlInput.value = url;
        updateProjectPreview();
      });
    });
  }

  function updateProjectPreview() {
    const index = (document.getElementById('project-index') ? document.getElementById('project-index').value.trim() : '') || '01';
    const tag = (document.getElementById('project-tag') ? document.getElementById('project-tag').value.trim() : '') || 'SPOTIFY SINGLE';
    const title = (document.getElementById('project-title') ? document.getElementById('project-title').value.trim() : '') || 'Project Title Preview';
    const desc = document.getElementById('project-desc') ? document.getElementById('project-desc').value.trim() : '';
    const chips = document.getElementById('project-chips') ? document.getElementById('project-chips').value.trim() : '';
    const highlight = document.getElementById('project-highlight') ? document.getElementById('project-highlight').checked : false;
    const music_url = document.getElementById('project-music-url') ? document.getElementById('project-music-url').value.trim() : '';
    const poster_url = projectPosterUrlInput ? projectPosterUrlInput.value.trim() : '';

    const highlightClass = highlight ? 'project-card project-card--highlight' : 'project-card';
    const tagClass = highlight ? 'project-tag project-tag--award' : 'project-tag';

    let chipsHtml = '';
    if (chips) {
      const chipsArr = chips.split(',').map(c => c.trim()).filter(Boolean);
      if (chipsArr.length > 0) {
        chipsHtml = `<div class="project-chips" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">` +
          chipsArr.map(chip => `<span style="font-size:10px; font-weight:700; text-transform:uppercase; color:#555555; background:rgba(0,0,0,0.05); padding:3px 8px; border-radius:4px; border:1px solid rgba(0,0,0,0.08);">${escapeHtml(chip)}</span>`).join('') +
          `</div>`;
      }
    }

    let posterHtml = '';
    if (poster_url) {
      posterHtml = `
        <div class="project-poster-wrap" style="width:100%; height:160px; overflow:hidden; border-radius:8px; margin-bottom:12px; background:#f0f0f0;">
          <img class="project-poster-img" src="${escapeHtml(poster_url)}" alt="Poster Preview" style="width:100%; height:100%; object-fit:cover;">
        </div>
      `;
    }

    let musicBtnHtml = '';
    if (music_url) {
      musicBtnHtml = `
        <div style="margin-top:12px;">
          <a href="${escapeHtml(music_url)}" target="_blank" class="project-music-btn" style="display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#1DB954; background:rgba(29,185,84,0.08); padding:6px 12px; border-radius:20px; border:1px solid rgba(29,185,84,0.2); text-decoration:none;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.12-.779-.18-.899-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.479.659.301 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C13.68 8.4 8.16 8.22 4.98 9.18c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 3.78-1.14 9.9-.96 14.52 1.8.54.3.72.96.42 1.5-.3.54-.96.78-1.5.48z"/></svg>
            Listen on Spotify / Music
          </a>
        </div>
      `;
    }

    const container = document.getElementById('project-preview-card-container');
    if (container) {
      const highlightStyle = highlight
        ? 'background: linear-gradient(145deg, #fff9f8, #ffffff); border: 1px solid rgba(221,75,57,0.4); box-shadow: 0 8px 32px rgba(221,75,57,0.15);'
        : 'background: #ffffff; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 16px rgba(0,0,0,0.06);';

      const tagStyle = highlight
        ? 'background: linear-gradient(135deg, rgba(221,75,57,0.12), rgba(228,115,100,0.08)); border-color: rgba(221,75,57,0.4); color: #c23321;'
        : 'background: rgba(221,75,57,0.07); border-color: rgba(221,75,57,0.18); color: #dd4b39;';

      container.innerHTML = `
        <div class="${highlightClass}" style="${highlightStyle} color:#000000; padding:24px; border-radius:14px; position:relative; transition: all 0.3s ease;">
          ${posterHtml}
          <div class="project-index" style="font-size:11px; font-weight:800; letter-spacing:0.18em; color:#dd4b39; opacity:0.6; margin-bottom:4px;">${escapeHtml(index)}</div>
          <span class="${tagClass}" style="display:inline-block; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; padding:4px 12px; border-radius:30px; border:1px solid; ${tagStyle}">${escapeHtml(tag)}</span>
          <h3 style="font-size:18px; font-weight:700; color:#000000; margin:10px 0 6px 0; line-height:1.3;">${escapeHtml(title)}</h3>
          ${desc ? `<p style="font-size:13.5px; color:rgba(0,0,0,0.65); line-height:1.6; margin-bottom:6px;">${escapeHtml(desc)}</p>` : ''}
          ${chipsHtml}
          ${musicBtnHtml}
        </div>
      `;
    }
  }

  // Attach live input listeners to all project form inputs
  ['input', 'change'].forEach(evt => {
    document.querySelectorAll('#project-index, #project-tag, #project-title, #project-desc, #project-chips, #project-highlight, #project-music-url, #project-poster-url').forEach(el => {
      el.addEventListener(evt, updateProjectPreview);
    });
  });
  updateProjectPreview();

  function loadProjects() {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        projectsList.innerHTML = '';
        if (!data || data.length === 0) {
          projectsList.innerHTML = '<p style="color:var(--text-dim); text-align:center;">No projects in catalog yet.</p>';
          return;
        }
        data.forEach(proj => {
          const highlightBadge = proj.highlight === 1 ? ' <strong style="color:var(--coral)">[HIGHLIGHT]</strong>' : '';
          const musicBadge = proj.music_url ? ' <span style="color:#1DB954; font-size:11px; font-weight:700;">[SPOTIFY/MUSIC]</span>' : '';
          const posterBadge = proj.poster_url ? ' <span style="color:var(--text-dim); font-size:11px;">[POSTER]</span>' : '';

          projectsList.innerHTML += `
            <div class="crud-item">
              <div class="crud-details">
                <h4>[${escapeHtml(proj.project_index)}] ${escapeHtml(proj.title)}${highlightBadge}${musicBadge}${posterBadge}</h4>
                <p>Tag: ${escapeHtml(proj.tag)} ${proj.chips ? '| Chips: ' + escapeHtml(proj.chips) : ''}</p>
              </div>
              <div class="crud-actions">
                <button class="btn-edit" onclick="editProject('${proj.id}', '${escapeHtml(proj.project_index)}', '${escapeHtml(proj.tag)}', '${escapeHtml(proj.title)}', '${escapeHtml(proj.description || '')}', '${escapeHtml(proj.chips || '')}', ${proj.highlight}, '${escapeHtml(proj.music_url || '')}', '${escapeHtml(proj.poster_url || '')}')">Edit</button>
                <button class="btn-delete" onclick="deleteProject('${proj.id}')">Delete</button>
              </div>
            </div>
          `;
        });
      })
      .catch(err => console.error("Error loading projects:", err));
  }

  window.editProject = function (id, project_index, tag, title, description, chips, highlight, music_url, poster_url) {
    projectIdInput.value = id;
    document.getElementById('project-index').value = project_index;
    document.getElementById('project-tag').value = tag;
    document.getElementById('project-title').value = title;
    document.getElementById('project-desc').value = description;
    document.getElementById('project-chips').value = chips;
    document.getElementById('project-highlight').checked = (highlight === 1);
    if (document.getElementById('project-music-url')) document.getElementById('project-music-url').value = music_url || '';
    if (projectPosterUrlInput) projectPosterUrlInput.value = poster_url || '';

    projectFormTitle.innerText = "Edit Project Details";
    projectSubmitBtn.innerText = "Update Project";
    updateProjectPreview();
  };

  function resetProjectForm() {
    projectIdInput.value = '';
    if (projectForm) projectForm.reset();
    projectFormTitle.innerText = "Add New Music / Project";
    projectSubmitBtn.innerText = "Add Project";
    if (posterUploadStatus) posterUploadStatus.innerText = '';
    updateProjectPreview();
  }

  if (resetProjectBtn) resetProjectBtn.addEventListener('click', resetProjectForm);

  if (projectForm) {
    projectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = projectIdInput.value;
      const project_index = document.getElementById('project-index').value.trim();
      const tag = document.getElementById('project-tag').value.trim();
      const title = document.getElementById('project-title').value.trim();
      const description = document.getElementById('project-desc').value.trim();
      const chips = document.getElementById('project-chips').value.trim();
      const highlight = document.getElementById('project-highlight').checked;
      const music_url = document.getElementById('project-music-url') ? document.getElementById('project-music-url').value.trim() : '';
      const poster_url = projectPosterUrlInput ? projectPosterUrlInput.value.trim() : '';

      fetchWithAuth('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id || undefined, project_index, tag, title, description, chips, highlight, music_url, poster_url })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showAdminToast(id ? "Project updated successfully!" : "New project added to catalog!");
            resetProjectForm();
            loadProjects();
          } else {
            showAdminToast(data.error || "Failed to save project.", "error");
          }
        })
        .catch(err => showAdminToast("Network error saving project.", "error"));
    });
  }

  window.deleteProject = function (id) {
    if (confirm("Delete this project from catalog permanently?")) {
      fetchWithAuth(`/api/projects/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showAdminToast("Project removed from catalog.");
            loadProjects();
          } else {
            showAdminToast("Failed to delete project.", "error");
          }
        })
        .catch(err => showAdminToast("Network error removing project.", "error"));
    }
  };

  /* ==========================================================================
     8. CREDITS CMS CONTROL
     ========================================================================== */
  const creditForm = document.getElementById('credit-editor-form');
  const creditFormTitle = document.getElementById('credit-form-title');
  const creditSubmitBtn = document.getElementById('btn-save-credit');
  const creditIdInput = document.getElementById('credit-id');
  const creditsList = document.getElementById('credits-list-container');
  const resetCreditBtn = document.getElementById('btn-reset-credit');

  function loadCredits() {
    fetch('/api/credits')
      .then(res => res.json())
      .then(data => {
        creditsList.innerHTML = '';
        if (data.length === 0) {
          creditsList.innerHTML = '<p style="color:var(--text-dim); text-align:center;">No credits listed yet.</p>';
          return;
        }
        data.forEach(crd => {
          const highlightBadge = crd.award === 1 ? ' <strong style="color:var(--coral)">[AWARD]</strong>' : '';
          creditsList.innerHTML += `
            <div class="crud-item">
              <div class="crud-details">
                <h4>${escapeHtml(crd.title)}${highlightBadge}</h4>
                <p>Role: ${escapeHtml(crd.role)}</p>
              </div>
              <div class="crud-actions">
                <button class="btn-edit" onclick="editCredit('${crd.id}', '${escapeHtml(crd.title)}', '${escapeHtml(crd.role)}', ${crd.award})">Edit</button>
                <button class="btn-delete" onclick="deleteCredit('${crd.id}')">Delete</button>
              </div>
            </div>
          `;
        });
      })
      .catch(err => console.error("Error loading credits:", err));
  }

  window.editCredit = function (id, title, role, award) {
    creditIdInput.value = id;
    document.getElementById('credit-title').value = title;
    document.getElementById('credit-role').value = role;
    document.getElementById('credit-award').checked = (award === 1);

    creditFormTitle.innerText = "Edit Credit Highlight";
    creditSubmitBtn.innerText = "Update Credit";
  };

  function resetCreditForm() {
    creditIdInput.value = '';
    if (creditForm) creditForm.reset();
    creditFormTitle.innerText = "Add Selected Credit";
    creditSubmitBtn.innerText = "Add Credit";
  }

  if (resetCreditBtn) resetCreditBtn.addEventListener('click', resetCreditForm);

  if (creditForm) {
    creditForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = creditIdInput.value;
      const title = document.getElementById('credit-title').value.trim();
      const role = document.getElementById('credit-role').value.trim();
      const award = document.getElementById('credit-award').checked;

      fetchWithAuth('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id || undefined, title, role, award })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showAdminToast(id ? "Credit updated successfully!" : "New credit added!");
            resetCreditForm();
            loadCredits();
          } else {
            showAdminToast(data.error || "Failed to save credit.", "error");
          }
        })
        .catch(err => showAdminToast("Network error saving credit.", "error"));
    });
  }

  window.deleteCredit = function (id) {
    if (confirm("Are you sure you want to remove this credit entry?")) {
      fetchWithAuth(`/api/credits/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showAdminToast("Credit entry deleted.");
            loadCredits();
          } else {
            showAdminToast("Failed to delete credit.", "error");
          }
        })
        .catch(err => showAdminToast("Network error removing credit.", "error"));
    }
  };

  /* ==========================================================================
     10. INQUIRIES INBOX VIEWER (RESPONSIVE + MAILTO & WEBMAIL REPLY)
     ========================================================================== */
  const inquiriesBody = document.getElementById('inquiries-table-body');

  window.openInquiryReply = function (email, name, message) {
    if (!email) {
      if (typeof showAdminToast === 'function') showAdminToast("No recipient email found.", "error");
      return;
    }
    const rawSubject = 'Re: House of Tod Project Inquiry';
    const rawBody = `Hi ${name || 'there'},\n\nThank you for reaching out to House of Tod regarding your project brief:\n\n"${message || ''}"\n\nWe would love to discuss next steps with you.\n\nBest regards,\nKaran Aherewal\nHouse of Tod Studio`;

    const encEmail = encodeURIComponent(email);
    const encSubject = encodeURIComponent(rawSubject);
    const encBody = encodeURIComponent(rawBody);

    // Primary: Webmail Compose (Gmail) in a new tab
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encEmail}&su=${encSubject}&body=${encBody}`;
    // Fallback: Default mailto client
    const mailtoUrl = `mailto:${encEmail}?subject=${encSubject}&body=${encBody}`;

    const win = window.open(gmailUrl, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      // If popup blocker blocked window.open or webmail didn't launch, use mailto
      window.location.href = mailtoUrl;
    }
  };

  if (inquiriesBody) {
    inquiriesBody.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-reply-email');
      if (!btn) return;

      let email = btn.dataset.email || '';
      let name = btn.dataset.name || '';
      let message = btn.dataset.message || '';

      try { email = decodeURIComponent(email); } catch (err) { }
      try { name = decodeURIComponent(name); } catch (err) { }
      try { message = decodeURIComponent(message); } catch (err) { }

      openInquiryReply(email, name, message);
    });
  }

  function loadInquiries() {
    fetchWithAuth('/api/inquiries')
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        if (!inquiriesBody) return;
        inquiriesBody.innerHTML = '';
        if (data.length === 0) {
          inquiriesBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-dim); padding: 30px;">No client messages received in inbox.</td></tr>';
          return;
        }

        data.forEach(inq => {
          const rowClass = inq.status === 'unread' ? 'unread' : '';
          const statusLabel = inq.status === 'unread' ? 'Unread' : 'Read';
          const markReadButton = inq.status === 'unread'
            ? `<button class="btn-edit" onclick="markInquiryRead('${inq.id}')">Mark Read</button>`
            : '';

          const safeEmail = escapeHtml(inq.email || '');
          const safeName = escapeHtml(inq.name || '');

          const encEmailAttr = encodeURIComponent(inq.email || '');
          const encNameAttr = encodeURIComponent(inq.name || '');
          const encMessageAttr = encodeURIComponent(inq.message || '');

          inquiriesBody.innerHTML += `
            <tr class="${rowClass}">
              <td style="font-size:12px; color:var(--text-dim); white-space:nowrap;">${escapeHtml(inq.date || '')}</td>
              <td>
                <strong style="color:var(--text);">${safeName}</strong><br>
                <span style="font-size:12px; color:var(--text-dim)">
                  <a href="mailto:${safeEmail}" style="color:var(--coral); text-decoration:none;">${safeEmail}</a><br>
                  ${inq.phone ? `<a href="tel:${inq.phone}" style="color:var(--text-dim);">${escapeHtml(inq.phone)}</a>` : ''}
                </span>
              </td>
              <td>
                <div class="inquiry-message-text">${escapeHtml(inq.message)}</div>
              </td>
              <td>
                <span class="status-indicator ${inq.status}">${statusLabel}</span>
              </td>
              <td>
                <div class="crud-actions" style="flex-wrap:wrap; gap:6px;">
                  <button type="button" class="btn-reply-email" data-email="${encEmailAttr}" data-name="${encNameAttr}" data-message="${encMessageAttr}" title="Reply to ${safeName} via email">Reply Email ✉</button>
                  ${markReadButton}
                  <button class="btn-delete" onclick="deleteInquiry('${inq.id}')">Delete</button>
                </div>
              </td>
            </tr>
          `;
        });
      })
      .catch(err => {
        console.error("Error loading inquiries:", err);
        showAdminToast("Failed to load inbox.", "error");
      });
  }

  window.markInquiryRead = function (id) {
    fetchWithAuth(`/api/inquiries/${id}/read`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showAdminToast("Message marked as read.");
          loadInquiries();
        } else {
          showAdminToast("Failed to update message.", "error");
        }
      })
      .catch(err => showAdminToast("Network error marking message read.", "error"));
  };

  window.deleteInquiry = function (id) {
    if (confirm("Delete this contact message permanently?")) {
      fetchWithAuth(`/api/inquiries/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showAdminToast("Message deleted from inbox.");
            loadInquiries();
          } else {
            showAdminToast("Failed to delete message.", "error");
          }
        })
        .catch(err => showAdminToast("Network error removing message.", "error"));
    }
  };

  /* ==========================================================================
     11. PASSWORD CHANGE MODAL CONTROL
     ========================================================================== */
  const pwModal = document.getElementById('pw-modal');
  const openPwModalBtn = document.getElementById('btn-open-pw-modal');
  const closePwModalBtn = document.getElementById('btn-close-pw-modal');
  const pwChangeForm = document.getElementById('pw-change-form');

  if (openPwModalBtn) {
    openPwModalBtn.addEventListener('click', () => {
      if (pwModal) pwModal.classList.add('active');
    });
  }

  const closePwModal = () => {
    if (pwModal) pwModal.classList.remove('active');
    if (pwChangeForm) pwChangeForm.reset();
  };

  if (closePwModalBtn) closePwModalBtn.addEventListener('click', closePwModal);

  if (pwChangeForm) {
    pwChangeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newPw = document.getElementById('new-pw').value;
      const confirmPw = document.getElementById('confirm-pw').value;

      if (newPw !== confirmPw) {
        showAdminToast("Passwords do not match.", "error");
        return;
      }

      if (newPw.length < 6) {
        showAdminToast("Password must be at least 6 characters long.", "error");
        return;
      }

      fetchWithAuth('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPw })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showAdminToast("Password updated successfully!");
            closePwModal();
          } else {
            showAdminToast(data.error || "Failed to update password.", "error");
          }
        })
        .catch(err => showAdminToast("Network error updating password.", "error"));
    });
  }

  /* ==========================================================================
     12. LOGOUT BEHAVIOR
     ========================================================================== */
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      fetch('/api/logout', { method: 'POST' })
        .then(() => {
          window.location.href = '/admin/login.html';
        })
        .catch(() => {
          window.location.href = '/admin/login.html';
        });
    });
  }

  /* ==========================================================================
     12.5 MUSIC MANAGER CMS CONTROL (WITH AUDIO UPLOAD & REORDER)
     ========================================================================== */
  const musicForm = document.getElementById('music-editor-form');
  const musicFormTitle = document.getElementById('music-form-title');
  const musicSubmitBtn = document.getElementById('btn-save-music');
  const musicIdInput = document.getElementById('music-id');
  const musicList = document.getElementById('music-list-container');
  const resetMusicBtn = document.getElementById('btn-reset-music');
  const btnUploadAudio = document.getElementById('btn-upload-audio');
  const musicFileInput = document.getElementById('music-file-input');
  const musicUploadStatus = document.getElementById('music-upload-status');
  const musicFilenameUrlInput = document.getElementById('music-filename-url');
  const adminAudioPreview = document.getElementById('admin-audio-preview');
  const adminAudioPreviewWrap = document.getElementById('admin-audio-preview-wrap');

  let currentTracksList = [];

  if (btnUploadAudio && musicFileInput) {
    btnUploadAudio.addEventListener('click', () => {
      if (!musicFileInput.files || musicFileInput.files.length === 0) {
        showAdminToast("Please select an audio file to upload.", "error");
        return;
      }

      const file = musicFileInput.files[0];
      const formData = new FormData();
      formData.append('file', file);

      if (musicUploadStatus) musicUploadStatus.innerText = "Uploading audio file (this may take a few seconds)...";

      fetchWithAuth('/api/music/upload', {
        method: 'POST',
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.url) {
            if (musicUploadStatus) musicUploadStatus.innerText = `Uploaded: ${data.originalName || data.filename}`;
            showAdminToast("Audio file uploaded successfully!");
            if (musicFilenameUrlInput) musicFilenameUrlInput.value = data.url;

            // Auto-fill title if empty
            const titleInput = document.getElementById('music-title');
            if (titleInput && !titleInput.value) {
              const baseName = (data.originalName || data.filename).replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9\s_-]/g, " ");
              titleInput.value = baseName.trim();
            }

            // Update Preview Player
            if (adminAudioPreview && adminAudioPreviewWrap) {
              adminAudioPreview.src = data.url;
              adminAudioPreviewWrap.style.display = 'block';
            }
          } else {
            if (musicUploadStatus) musicUploadStatus.innerText = "Audio upload failed.";
            showAdminToast(data.error || "Audio upload failed.", "error");
          }
        })
        .catch(err => {
          console.error("Audio Upload error:", err);
          if (musicUploadStatus) musicUploadStatus.innerText = "Network error uploading audio.";
          showAdminToast("Connection error uploading audio file.", "error");
        });
    });
  }

  // Update audio preview player when filename URL changes manually
  if (musicFilenameUrlInput) {
    musicFilenameUrlInput.addEventListener('input', () => {
      const url = musicFilenameUrlInput.value.trim();
      if (url && adminAudioPreview && adminAudioPreviewWrap) {
        adminAudioPreview.src = url;
        adminAudioPreviewWrap.style.display = 'block';
      }
    });
  }

  // --- Drag-and-Drop state ---
  let _dragSrc = null;

  function _onDragStart(e) {
    _dragSrc = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.trackId);
    setTimeout(() => { this.style.opacity = '0.45'; }, 0);
  }

  function _onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (this !== _dragSrc) {
      this.style.border = '1px solid var(--coral)';
      this.style.background = 'rgba(221,75,57,0.06)';
    }
    return false;
  }

  function _onDragLeave() {
    this.style.border = '1px solid rgba(255,255,255,0.06)';
    this.style.background = 'rgba(255,255,255,0.02)';
  }

  function _onDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    if (!musicList || _dragSrc === this) return;

    // Re-insert dragged element before or after drop target
    const items = [...musicList.querySelectorAll('.music-track-item')];
    const srcIdx = items.indexOf(_dragSrc);
    const dstIdx = items.indexOf(this);

    if (srcIdx < dstIdx) {
      musicList.insertBefore(_dragSrc, this.nextSibling);
    } else {
      musicList.insertBefore(_dragSrc, this);
    }

    this.style.border = '1px solid rgba(255,255,255,0.06)';
    this.style.background = 'rgba(255,255,255,0.02)';

    // Persist new order
    const orderedIds = [...musicList.querySelectorAll('.music-track-item')].map(el => parseInt(el.dataset.trackId, 10));
    fetchWithAuth('/api/music/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          showAdminToast('Playlist order saved!');
          loadMusicTracks(); // refresh numbering
        } else {
          showAdminToast('Failed to save order.', 'error');
        }
      })
      .catch(() => showAdminToast('Network error reordering.', 'error'));
    return false;
  }

  function _onDragEnd() {
    this.style.opacity = '1';
    if (musicList) {
      musicList.querySelectorAll('.music-track-item').forEach(el => {
        el.style.border = '1px solid rgba(255,255,255,0.06)';
        el.style.background = 'rgba(255,255,255,0.02)';
      });
    }
  }

  function loadMusicTracks() {
    if (!musicList) return;
    fetchWithAuth('/api/music?all=true&admin=true')
      .then(res => res.json())
      .then(tracks => {
        musicList.innerHTML = '';
        currentTracksList = tracks || [];
        if (!tracks || tracks.length === 0) {
          musicList.innerHTML = '<p style="color:var(--text-dim); text-align:center; padding:30px 0;">No music tracks in playlist catalog yet.</p>';
          return;
        }

        tracks.forEach((track, idx) => {
          const isActive = track.active === 1;
          const filenameShort = track.filename ? track.filename.split('/').pop() : '—';

          const activeText = isActive ? '● Active' : '○ Off';
          const activeColor = isActive ? '#4caf50' : 'rgba(255,255,255,0.3)';

          const isFirst = idx === 0;
          const isLast = idx === tracks.length - 1;

          const itemHtml = `
            <div class="crud-item music-track-item" data-track-id="${track.id}" draggable="true" title="Drag to Reorder">
              <div class="crud-details">
                <h4>[#${idx + 1}] ${escapeHtml(track.title)}</h4>
                <p>Artist: ${escapeHtml(track.artist)} | File: ${escapeHtml(filenameShort)} | Status: ${activeText}</p>
              </div>
              <div class="crud-actions">
                <button type="button" class="btn-edit" onclick="previewMusicTrack('${escapeHtml(track.filename)}')">Play</button>
                <button type="button" class="btn-edit" onclick="toggleMusicActive('${track.id}', ${track.active})">${isActive ? 'Disable' : 'Enable'}</button>
                <button type="button" class="btn-edit" onclick="editMusicTrack('${track.id}', '${escapeHtml(track.title)}', '${escapeHtml(track.artist)}', '${escapeHtml(track.filename)}', ${track.active})">Edit</button>
                <button type="button" class="btn-delete" onclick="deleteMusicTrack('${track.id}')">Delete</button>
              </div>
            </div>
          `;

          musicList.insertAdjacentHTML('beforeend', itemHtml);
        });

        // Add event listeners for drag and drop and double click
        musicList.querySelectorAll('.music-track-item').forEach(item => {
          const trackId = parseInt(item.dataset.trackId, 10);
          const track = tracks.find(t => t.id === trackId);

          item.addEventListener('dblclick', (e) => {
            if (e.target.closest('button')) return;
            if (track) editMusicTrack(track.id, track.title, track.artist, track.filename, track.active);
          });

          item.addEventListener('dragstart', _onDragStart);
          item.addEventListener('dragover', _onDragOver);
          item.addEventListener('dragleave', _onDragLeave);
          item.addEventListener('drop', _onDrop);
          item.addEventListener('dragend', _onDragEnd);
        });
      })
      .catch(err => {
        console.error('Error loading music tracks:', err);
        if (musicList) musicList.innerHTML = '<p style="color:var(--coral); text-align:center;">Error loading tracks. Please refresh.</p>';
      });
  }

  window.previewMusicTrack = function (url) {
    if (!url) return;
    if (adminAudioPreview && adminAudioPreviewWrap) {
      adminAudioPreview.src = url;
      adminAudioPreviewWrap.style.display = 'block';
      adminAudioPreview.play().catch(e => console.log("Preview autoplay:", e));
      showAdminToast("Playing track preview");
    }
  };

  window.editMusicTrack = function (id, title, artist, filename, active) {
    musicIdInput.value = id;
    document.getElementById('music-title').value = title;
    document.getElementById('music-artist').value = artist;
    musicFilenameUrlInput.value = filename;
    document.getElementById('music-active').checked = (active === 1);

    if (adminAudioPreview && adminAudioPreviewWrap && filename) {
      adminAudioPreview.src = filename;
      adminAudioPreviewWrap.style.display = 'block';
    }

    musicFormTitle.innerText = "Edit Music Track Metadata";
    musicSubmitBtn.innerText = "Update Track";
  };

  function resetMusicForm() {
    musicIdInput.value = '';
    if (musicForm) musicForm.reset();
    document.getElementById('music-artist').value = "House of Tod";
    document.getElementById('music-active').checked = true;
    musicFormTitle.innerText = "Set Website Background Music Track";
    musicSubmitBtn.innerText = "Save Background Track";
    if (musicUploadStatus) musicUploadStatus.innerText = '';
    if (adminAudioPreviewWrap) adminAudioPreviewWrap.style.display = 'none';
  }

  if (resetMusicBtn) resetMusicBtn.addEventListener('click', resetMusicForm);

  if (musicForm) {
    musicForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = musicIdInput.value;
      const title = document.getElementById('music-title').value.trim();
      const artist = document.getElementById('music-artist').value.trim() || 'House of Tod';
      const filename = musicFilenameUrlInput.value.trim();
      const active = document.getElementById('music-active').checked ? 1 : 0;

      if (!title || !filename) {
        showAdminToast("Please provide song title and audio file.", "error");
        return;
      }

      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/music/${id}` : '/api/music';

      fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title, artist, filename, active })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showAdminToast(id ? "Music track updated successfully!" : "New track added to playlist!");
            resetMusicForm();
            loadMusicTracks();
          } else {
            showAdminToast(data.error || "Failed to save track.", "error");
          }
        })
        .catch(err => showAdminToast("Network error saving track.", "error"));
    });
  }

  window.toggleMusicActive = function (id, currentActive) {
    const track = currentTracksList.find(t => t.id === id);
    if (!track) return;
    const newActive = currentActive === 1 ? 0 : 1;

    fetchWithAuth(`/api/music/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: track.title, artist: track.artist, filename: track.filename, active: newActive })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showAdminToast(`Track ${newActive === 1 ? 'enabled' : 'disabled'}.`);
          loadMusicTracks();
        } else {
          showAdminToast("Failed to update status.", "error");
        }
      })
      .catch(err => showAdminToast("Network error toggling track.", "error"));
  };

  window.moveMusicTrack = function (id, direction) {
    const idx = currentTracksList.findIndex(t => t.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentTracksList.length) return;

    // Swap elements in memory array
    const updatedList = [...currentTracksList];
    const temp = updatedList[idx];
    updatedList[idx] = updatedList[targetIdx];
    updatedList[targetIdx] = temp;

    const orderedIds = updatedList.map(t => t.id);

    fetchWithAuth('/api/music/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showAdminToast("Playlist order updated!");
          loadMusicTracks();
        } else {
          showAdminToast("Failed to reorder playlist.", "error");
        }
      })
      .catch(err => showAdminToast("Network error reordering tracks.", "error"));
  };

  window.deleteMusicTrack = function (id) {
    if (confirm("Are you sure you want to delete this track from playlist and disk?")) {
      fetchWithAuth(`/api/music/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showAdminToast("Track deleted permanently.");
            loadMusicTracks();
          } else {
            showAdminToast(data.error || "Failed to delete track.", "error");
          }
        })
        .catch(err => showAdminToast("Network error deleting track.", "error"));
    }
  };

  /* ==========================================================================
     13. Utility Helpers
     ========================================================================== */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

});

