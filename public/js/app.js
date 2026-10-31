/**
 * PulseAI Healthcare - AI Doctor Appointment & Telemedicine Platform
 * Client Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let allDoctors = [];
  let currentAppointments = [];
  let selectedDoctor = null;
  let selectedSlot = null;
  let lastBookedAppointment = null;
  let telemetryInterval = null;

  // Initialize Elements
  initNavigation();
  initDoctorFilters();
  initHeroTriage();
  initFullTriage();
  initBookingModal();
  initTelehealthRoom();
  initDevOpsTelemetry();

  // Initial Data Load
  loadDoctors();
  loadAppointments();

  /**
   * ---------------------------------------------------------------------------
   * 1. Tab Navigation
   * ---------------------------------------------------------------------------
   */
  function initNavigation() {
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    const tabViews = document.querySelectorAll('.tab-view');

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTabId = btn.getAttribute('data-tab');

        // Toggle active button
        tabButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle view
        tabViews.forEach((view) => {
          if (view.id === targetTabId) {
            view.classList.add('active-view');
          } else {
            view.classList.remove('active-view');
          }
        });

        // Start/stop telemetry polling if entering/leaving telemetry tab
        if (targetTabId === 'view-telemetry') {
          fetchTelemetry();
          if (!telemetryInterval) {
            telemetryInterval = setInterval(fetchTelemetry, 3000);
          }
        }
      });
    });

    // Quick Book New Doctor button in Appointments view
    const btnQuickNew = document.getElementById('btn-quick-new-booking');
    if (btnQuickNew) {
      btnQuickNew.addEventListener('click', () => {
        switchTab('view-doctors');
      });
    }
  }

  function switchTab(tabId) {
    const tabBtn = document.querySelector(`.nav-tab-btn[data-tab="${tabId}"]`);
    if (tabBtn) tabBtn.click();
  }

  /**
   * ---------------------------------------------------------------------------
   * 2. Doctors Catalog & Filtering
   * ---------------------------------------------------------------------------
   */
  async function loadDoctors(department = 'All', mode = 'all') {
    const container = document.getElementById('doctors-container');
    if (!container) return;

    try {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
          <div style="display: inline-block; width: 32px; height: 32px; border: 3px solid rgba(56, 189, 248, 0.3); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <div style="margin-top: 0.75rem;">Loading verified medical specialists...</div>
        </div>
      `;

      let url = '/api/doctors?';
      if (department !== 'All') url += `department=${encodeURIComponent(department)}&`;
      if (mode !== 'all') url += `mode=${encodeURIComponent(mode)}&`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && data.doctors) {
        allDoctors = data.doctors;
        renderDoctors(allDoctors);
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--danger);">
          Unable to load medical specialists. Please refresh the page.
        </div>
      `;
    }
  }

  function renderDoctors(doctors) {
    const container = document.getElementById('doctors-container');
    if (!container) return;

    if (doctors.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
          <h3>No doctors found for this specialty filter</h3>
          <p style="font-size: 0.88rem; margin-top: 0.5rem;">Try choosing "All Specialties" or a different consultation mode.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = doctors
      .map((doc) => {
        const slotButtonsHtml = doc.slots
          .map(
            (slot) => `
          <button class="slot-btn" data-doc-id="${doc.id}" data-slot="${slot}">${slot}</button>
        `
          )
          .join('');

        return `
        <article class="doctor-card" data-doc-id="${doc.id}">
          <div class="doctor-card-top">
            <div class="doctor-avatar-wrap">
              <img src="${doc.avatar}" alt="${doc.name}" class="doctor-avatar-img" onerror="this.src='https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80'" />
              <span class="doctor-online-dot" title="Available for consult"></span>
            </div>
            <div class="doctor-info-header">
              <div class="doctor-badge-row">
                <span class="dept-badge">${doc.department}</span>
                <span class="rating-pill">★ ${doc.rating} (${doc.reviewCount})</span>
              </div>
              <h3 class="doctor-name">${doc.name}</h3>
              <p class="doctor-title">${doc.title}</p>
            </div>
          </div>

          <div class="doctor-card-body">
            <div class="doctor-meta-grid">
              <div class="meta-item">
                <span class="meta-label">Experience</span>
                <span class="meta-value">${doc.experienceYears}+ Years</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Hospital</span>
                <span class="meta-value" style="font-size: 0.72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${doc.hospital.split(' ')[0]} Health</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Modes</span>
                <span class="meta-value">🎥 Video &bull; 🏥 In-Clinic</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Next Slot</span>
                <span class="meta-value" style="color: var(--success-light);">${doc.availability}</span>
              </div>
            </div>

            <p class="doctor-bio">${doc.bio}</p>

            <div style="margin-top: 0.25rem;">
              <div class="doctor-slots-title">Available Slots:</div>
              <div class="slots-row" style="margin-top: 0.35rem;">
                ${slotButtonsHtml}
              </div>
            </div>
          </div>

          <div class="doctor-card-footer">
            <div class="fee-wrap">
              <span class="fee-label">Consultation</span>
              <span class="fee-amount">$${doc.fee} <span class="fee-period">/ session</span></span>
            </div>
            <button class="btn-book-doctor btn-trigger-book" data-doc-id="${doc.id}">
              <span>Book Visit</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </article>
      `;
      })
      .join('');

    // Attach event handlers to slot buttons and Book Visit buttons
    container.querySelectorAll('.slot-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const docId = btn.getAttribute('data-doc-id');
        const slot = btn.getAttribute('data-slot');
        openBookingModal(docId, slot);
      });
    });

    container.querySelectorAll('.btn-trigger-book').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const docId = btn.getAttribute('data-doc-id');
        openBookingModal(docId);
      });
    });
  }

  function initDoctorFilters() {
    const deptPills = document.querySelectorAll('.dept-pill');
    const modeBtns = document.querySelectorAll('.mode-btn');

    let currentDept = 'All';
    let currentMode = 'all';

    deptPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        deptPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        currentDept = pill.getAttribute('data-dept');
        loadDoctors(currentDept, currentMode);
      });
    });

    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        modeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.getAttribute('data-mode');
        loadDoctors(currentDept, currentMode);
      });
    });
  }

  /**
   * ---------------------------------------------------------------------------
   * 3. AI Symptom Triage (Hero Banner & Full Form)
   * ---------------------------------------------------------------------------
   */
  function initHeroTriage() {
    const heroForm = document.getElementById('hero-ai-search-form');
    const heroInput = document.getElementById('hero-symptom-input');
    const chips = document.querySelectorAll('.symptom-chip');

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const symptom = chip.getAttribute('data-symptom');
        if (heroInput) heroInput.value = symptom;
        runTriage(symptom);
      });
    });

    if (heroForm) {
      heroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = heroInput.value.trim();
        if (text) runTriage(text);
      });
    }
  }

  function initFullTriage() {
    const fullForm = document.getElementById('full-triage-form');
    if (!fullForm) return;

    fullForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const symptoms = document.getElementById('triage-symptoms-text').value;
      const duration = document.getElementById('triage-duration-select').value;
      const severity = document.getElementById('triage-severity-select').value;
      const ageGroup = document.getElementById('triage-age-select').value;

      runTriage(symptoms, duration, severity, ageGroup);
    });
  }

  async function runTriage(symptoms, duration = '1-3 days', severity = 'Moderate', ageGroup = 'Adult') {
    // Switch to AI Symptom Checker tab
    switchTab('view-triage');

    // Populate full form if called from hero
    const textarea = document.getElementById('triage-symptoms-text');
    if (textarea) textarea.value = symptoms;

    const placeholder = document.getElementById('triage-placeholder');
    const reportBox = document.getElementById('triage-report-content');
    const submitBtn = document.getElementById('btn-submit-triage');

    if (placeholder) placeholder.style.display = 'none';
    if (reportBox) {
      reportBox.classList.add('active');
      reportBox.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <div style="display: inline-block; width: 36px; height: 36px; border: 3px solid rgba(139, 92, 246, 0.3); border-top-color: var(--accent-purple); border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <div style="margin-top: 1rem; font-weight: 700; color: #fff;">Analyzing symptoms with Clinical AI...</div>
          <div style="font-size: 0.82rem; margin-top: 0.35rem;">Cross-referencing triage protocols & specialist schedules...</div>
        </div>
      `;
    }

    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms, duration, severity, ageGroup })
      });

      const data = await res.json();
      if (data.success) {
        renderTriageReport(data);
      } else {
        reportBox.innerHTML = `<div style="color: var(--danger); padding: 1rem;">${data.error || 'Failed to complete diagnosis'}</div>`;
      }
    } catch (err) {
      console.error('Triage error:', err);
      reportBox.innerHTML = `<div style="color: var(--danger); padding: 1rem;">Service currently unavailable. Please verify cluster connection.</div>`;
    }
  }

  function renderTriageReport(data) {
    const reportBox = document.getElementById('triage-report-content');
    if (!reportBox) return;

    let bannerClass = 'report-banner-green';
    let bannerIcon = '🟢';
    if (data.urgency === 'Moderate') {
      bannerClass = 'report-banner-yellow';
      bannerIcon = '🟡';
    } else if (data.urgency === 'Urgent') {
      bannerClass = 'report-banner-red';
      bannerIcon = '🔴';
    }

    const conditionsList = data.potentialConditions.map((c) => `<li>${c}</li>`).join('');
    const questionsList = data.suggestedQuestions.map((q) => `<li>${q}</li>`).join('');
    const adviceList = data.careAdvice.map((a) => `<li>${a}</li>`).join('');

    const matchedDoctorsHtml = data.matchedDoctors
      .map(
        (doc) => `
      <div class="matched-doc-row">
        <div class="matched-doc-left">
          <img src="${doc.avatar}" alt="${doc.name}" class="matched-doc-avatar" />
          <div>
            <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">${doc.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${doc.title} &bull; $${doc.fee}</div>
          </div>
        </div>
        <button class="btn-book-matched" data-doc-id="${doc.id}">Book Specialist</button>
      </div>
    `
      )
      .join('');

    reportBox.innerHTML = `
      <div class="report-header-banner ${bannerClass}">
        <div>
          <div class="report-urgency-tag">
            <span>${bannerIcon}</span> ${data.urgency} Priority Triage
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
            Recommended Department: <strong style="color: #fff;">${data.recommendedDepartment}</strong>
          </div>
        </div>
        <span class="confidence-chip">${Math.round(data.confidenceScore * 100)}% Confidence</span>
      </div>

      <div class="report-section">
        <div class="report-section-title">Clinical AI Evaluation</div>
        <p style="font-size: 0.88rem; line-height: 1.5; color: var(--text-muted);">${data.clinicalAnalysis}</p>
      </div>

      <div class="report-section">
        <div class="report-section-title">Suspected Conditions (Differentials)</div>
        <ul class="conditions-list">${conditionsList}</ul>
      </div>

      <div class="report-section">
        <div class="report-section-title">Key Questions to Ask Your Doctor</div>
        <ul class="questions-list">${questionsList}</ul>
      </div>

      <div class="report-section">
        <div class="report-section-title">Immediate Self-Care Guidance</div>
        <ul class="advice-list">${adviceList}</ul>
      </div>

      <div class="report-section">
        <div class="report-section-title">Recommended ${data.recommendedDepartment} Doctors</div>
        <div class="matched-doctors-container">${matchedDoctorsHtml}</div>
      </div>

      <div class="disclaimer-box">
        <strong>Medical Disclaimer:</strong> ${data.disclaimer}
      </div>
    `;

    // Attach listener for booking from triage
    reportBox.querySelectorAll('.btn-book-matched').forEach((btn) => {
      btn.addEventListener('click', () => {
        const docId = btn.getAttribute('data-doc-id');
        openBookingModal(docId);
      });
    });
  }

  /**
   * ---------------------------------------------------------------------------
   * 4. Interactive Booking Modal Flow
   * ---------------------------------------------------------------------------
   */
  function initBookingModal() {
    const backdrop = document.getElementById('booking-modal-backdrop');
    const btnClose = document.getElementById('btn-modal-close');
    const btnCancel = document.getElementById('btn-cancel-modal');
    const form = document.getElementById('appointment-booking-form');
    const btnAddCal = document.getElementById('btn-add-calendar');
    const btnViewAppts = document.getElementById('btn-view-scheduled-appts');

    if (btnClose) btnClose.addEventListener('click', closeBookingModal);
    if (btnCancel) btnCancel.addEventListener('click', closeBookingModal);

    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeBookingModal();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleBookingSubmit();
      });
    }

    if (btnAddCal) {
      btnAddCal.addEventListener('click', downloadIcsCalendar);
    }

    if (btnViewAppts) {
      btnViewAppts.addEventListener('click', () => {
        closeBookingModal();
        switchTab('view-appointments');
      });
    }
  }

  function openBookingModal(docId, preselectedSlot = null) {
    const doc = allDoctors.find((d) => d.id === docId);
    if (!doc) return;

    selectedDoctor = doc;
    selectedSlot = preselectedSlot || doc.slots[0];

    const backdrop = document.getElementById('booking-modal-backdrop');
    const formView = document.getElementById('appointment-booking-form');
    const successView = document.getElementById('booking-success-card');
    const heading = document.getElementById('modal-heading');

    heading.textContent = `Schedule Appointment with ${doc.name}`;
    formView.style.display = 'block';
    successView.classList.remove('active');

    // Populate Doctor info
    document.getElementById('book-doctor-id').value = doc.id;
    document.getElementById('modal-doc-avatar').src = doc.avatar;
    document.getElementById('modal-doc-name').textContent = doc.name;
    document.getElementById('modal-doc-meta').textContent = `${doc.department} • $${doc.fee} / consult`;

    // Populate default date (Tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const dateInput = document.getElementById('book-date-input');
    dateInput.value = dateStr;
    dateInput.min = new Date().toISOString().split('T')[0];

    // Populate Time Slots
    const slotContainer = document.getElementById('modal-slot-options');
    slotContainer.innerHTML = doc.slots
      .map(
        (slot) => `
      <div class="modal-slot-btn ${slot === selectedSlot ? 'active' : ''}" data-slot="${slot}">
        ${slot}
      </div>
    `
      )
      .join('');

    document.getElementById('book-time-slot').value = selectedSlot;

    slotContainer.querySelectorAll('.modal-slot-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        slotContainer.querySelectorAll('.modal-slot-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSlot = btn.getAttribute('data-slot');
        document.getElementById('book-time-slot').value = selectedSlot;
      });
    });

    backdrop.classList.add('active');
  }

  function closeBookingModal() {
    const backdrop = document.getElementById('booking-modal-backdrop');
    if (backdrop) backdrop.classList.remove('active');
  }

  async function handleBookingSubmit() {
    const docId = document.getElementById('book-doctor-id').value;
    const patientName = document.getElementById('book-patient-name').value;
    const patientEmail = document.getElementById('book-patient-email').value;
    const date = document.getElementById('book-date-input').value;
    const time = document.getElementById('book-time-slot').value;
    const mode = document.querySelector('input[name="modal-consult-mode"]:checked').value;
    const reason = document.getElementById('book-reason-input').value;

    const payload = {
      doctorId: docId,
      patientName,
      patientEmail,
      date,
      time,
      mode,
      reason
    };

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.appointment) {
        lastBookedAppointment = data.appointment;

        // Hide form, show success confirmation card
        document.getElementById('appointment-booking-form').style.display = 'none';
        const successCard = document.getElementById('booking-success-card');
        successCard.classList.add('active');

        document.getElementById('success-appt-id').textContent = data.appointment.id;
        document.getElementById('success-doc-name').textContent = data.appointment.doctorName;
        document.getElementById('success-schedule-time').textContent = `${data.appointment.date} • ${data.appointment.time} (${data.appointment.mode === 'video' ? 'Video Telehealth' : 'In-Person Clinic'})`;

        // Refresh appointments list
        loadAppointments();
      }
    } catch (err) {
      console.error('Booking submission failed:', err);
      alert('Failed to schedule appointment. Please try again.');
    }
  }

  function downloadIcsCalendar() {
    if (!lastBookedAppointment) return;
    const appt = lastBookedAppointment;

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PulseAI Healthcare//Doctor Appointment//EN
BEGIN:VEVENT
SUMMARY:Medical Consultation with ${appt.doctorName}
DESCRIPTION:Reason: ${appt.reason}\\nMode: ${appt.mode.toUpperCase()}\\nReference: ${appt.id}
LOCATION:${appt.mode === 'video' ? 'PulseAI Secure Telehealth Video Room' : appt.hospital}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${appt.id}-consultation.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * ---------------------------------------------------------------------------
   * 5. My Appointments Dashboard
   * ---------------------------------------------------------------------------
   */
  async function loadAppointments() {
    const container = document.getElementById('appointments-container');
    const countBadge = document.getElementById('header-appt-count');
    if (!container) return;

    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();

      if (data.success && data.appointments) {
        currentAppointments = data.appointments;
        if (countBadge) countBadge.textContent = currentAppointments.length;
        renderAppointments(currentAppointments);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
  }

  function renderAppointments(appts) {
    const container = document.getElementById('appointments-container');
    if (!container) return;

    if (appts.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📅</div>
          <h3 style="color: #fff; margin-bottom: 0.5rem;">No appointments currently scheduled</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">You do not have any upcoming visits on file.</p>
          <button class="btn-book-doctor" onclick="document.getElementById('tab-btn-doctors').click()">
            Find Doctors &amp; Schedule
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = appts
      .map((appt) => {
        const dateObj = new Date(appt.date);
        const dayNum = isNaN(dateObj.getDate()) ? '15' : dateObj.getDate();
        const monthStr = isNaN(dateObj.getMonth())
          ? 'NOV'
          : dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();

        const isVideo = appt.mode === 'video';

        return `
        <div class="appointment-card" id="card-${appt.id}">
          <div class="appt-left-block">
            <div class="appt-date-badge">
              <span class="appt-date-day">${dayNum}</span>
              <span class="appt-date-month">${monthStr}</span>
            </div>
            <div class="appt-details">
              <span class="appt-id-tag">${appt.id} &bull; ${isVideo ? '🎥 HD Telehealth' : '🏥 In-Clinic Visit'}</span>
              <h3 class="appt-doc-name">${appt.doctorName}</h3>
              <div class="appt-meta-line">
                <span>⏰ ${appt.time}</span>
                <span>•</span>
                <span>${appt.department}</span>
              </div>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">
                <strong>Reason:</strong> ${appt.reason}
              </p>
            </div>
          </div>

          <div class="appt-right-actions">
            <span class="status-badge-confirmed">● ${appt.status}</span>
            <div class="appt-action-btns">
              ${
                isVideo
                  ? `<button class="btn-join-call btn-start-telehealth" data-appt-id="${appt.id}" data-doc-name="${appt.doctorName}" data-dept="${appt.department}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      <span>Join Video Call</span>
                    </button>`
                  : ''
              }
              <button class="btn-cancel-appt btn-cancel-booking" data-appt-id="${appt.id}">Cancel</button>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    // Attach Action Listeners
    container.querySelectorAll('.btn-start-telehealth').forEach((btn) => {
      btn.addEventListener('click', () => {
        const docName = btn.getAttribute('data-doc-name');
        const dept = btn.getAttribute('data-dept');
        launchTelehealth(docName, dept);
      });
    });

    container.querySelectorAll('.btn-cancel-booking').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const apptId = btn.getAttribute('data-appt-id');
        if (confirm(`Are you sure you want to cancel appointment ${apptId}?`)) {
          await cancelAppointment(apptId);
        }
      });
    });
  }

  async function cancelAppointment(id) {
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadAppointments();
      }
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  }

  /**
   * ---------------------------------------------------------------------------
   * 6. Telehealth Virtual Consultation Room
   * ---------------------------------------------------------------------------
   */
  function initTelehealthRoom() {
    const ctlMic = document.getElementById('ctl-mic');
    const ctlCam = document.getElementById('ctl-cam');
    const ctlShare = document.getElementById('ctl-share');
    const ctlEnd = document.getElementById('ctl-end-call');

    let isMuted = false;
    let isCamOff = false;

    if (ctlMic) {
      ctlMic.addEventListener('click', () => {
        isMuted = !isMuted;
        ctlMic.classList.toggle('active-off', isMuted);
      });
    }

    if (ctlCam) {
      ctlCam.addEventListener('click', () => {
        isCamOff = !isCamOff;
        ctlCam.classList.toggle('active-off', isCamOff);
      });
    }

    if (ctlShare) {
      ctlShare.addEventListener('click', () => {
        alert('Medical Record Screen Sharing active: ECG telemetry & lab results synced with physician.');
      });
    }

    if (ctlEnd) {
      ctlEnd.addEventListener('click', () => {
        alert('Telehealth Consultation concluded. Clinical prescription & notes generated.');
        switchTab('view-appointments');
      });
    }
  }

  function launchTelehealth(doctorName, department) {
    const nameEl = document.getElementById('telehealth-doc-name');
    const deptEl = document.getElementById('telehealth-doc-dept');
    if (nameEl) nameEl.textContent = doctorName;
    if (deptEl) deptEl.textContent = `${department} Specialist • Live Consultation`;

    switchTab('view-telehealth');
  }

  /**
   * ---------------------------------------------------------------------------
   * 7. Azure DevOps, AKS Cluster & Telemetry (Preserved & Verified)
   * ---------------------------------------------------------------------------
   */
  function initDevOpsTelemetry() {
    fetchClusterInfo();

    // API Console Buttons
    const apiBtns = document.querySelectorAll('.api-btn');
    apiBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        apiBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const endpoint = btn.getAttribute('data-endpoint');
        const method = btn.getAttribute('data-method') || 'GET';
        await runApiTest(endpoint, method);
      });
    });

    // Run default /healthz test
    runApiTest('/healthz', 'GET');
  }

  async function fetchClusterInfo() {
    try {
      const res = await fetch('/api/info');
      if (!res.ok) return;
      const data = await res.json();

      if (data.kubernetes) {
        const podName = document.getElementById('val-pod-name');
        const namespace = document.getElementById('val-namespace');
        const nodeName = document.getElementById('val-node-name');

        if (podName) podName.textContent = data.kubernetes.podName;
        if (namespace) namespace.textContent = data.kubernetes.podNamespace;
        if (nodeName) nodeName.textContent = data.kubernetes.nodeName;
      }

      if (data.runtime) {
        const pid = document.getElementById('val-pid');
        const nodeVer = document.getElementById('val-node-ver');
        if (pid) pid.textContent = data.runtime.pid;
        if (nodeVer) nodeVer.textContent = data.runtime.nodeVersion;
      }
    } catch (err) {
      console.warn('Could not fetch cluster info:', err);
    }
  }

  async function fetchTelemetry() {
    try {
      const res = await fetch('/api/telemetry');
      if (!res.ok) return;
      const data = await res.json();

      const uptimeEl = document.getElementById('val-uptime');
      const reqCountEl = document.getElementById('val-requests-count');
      const heapUsedEl = document.getElementById('val-heap-used');
      const heapTotalEl = document.getElementById('val-heap-total');
      const memPctEl = document.getElementById('val-memory-pct');
      const progressFill = document.getElementById('memory-progress-fill');

      if (uptimeEl) uptimeEl.textContent = `${data.uptimeSeconds}s`;
      if (reqCountEl) reqCountEl.textContent = `${data.requestCount} reqs`;
      if (heapUsedEl) heapUsedEl.textContent = `${data.heapUsedMb} MB`;
      if (heapTotalEl) heapTotalEl.textContent = `of ${data.heapTotalMb} MB Heap`;
      if (memPctEl) memPctEl.textContent = `${data.memoryUsagePercent}%`;
      if (progressFill) progressFill.style.width = `${Math.min(data.memoryUsagePercent, 100)}%`;
    } catch (err) {
      console.warn('Telemetry poll error:', err);
    }
  }

  async function runApiTest(endpoint, method) {
    const label = document.getElementById('console-endpoint-label');
    const status = document.getElementById('console-status-code');
    const output = document.getElementById('console-output');

    if (label) label.textContent = `${method} ${endpoint}`;
    if (output) output.textContent = 'Fetching response...';

    try {
      const options = { method };
      if (method === 'POST') {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify({
          client: 'PulseAI Web Console',
          timestamp: new Date().toISOString()
        });
      }

      const startTime = performance.now();
      const res = await fetch(endpoint, options);
      const elapsed = Math.round(performance.now() - startTime);

      const json = await res.json();
      if (status) {
        status.textContent = `HTTP ${res.status} ${res.statusText} (${elapsed}ms)`;
        status.style.color = res.ok ? 'var(--success-light)' : 'var(--danger)';
      }
      if (output) {
        output.textContent = JSON.stringify(json, null, 2);
      }
    } catch (err) {
      if (status) status.textContent = 'Error';
      if (output) output.textContent = `Request failed: ${err.message}`;
    }
  }
});
