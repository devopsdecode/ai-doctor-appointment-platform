const express = require('express');
const os = require('os');
const crypto = require('crypto');

const router = express.Router();
const startTime = Date.now();
let requestCounter = 0;

// Request counter middleware for basic metrics
router.use((req, res, next) => {
  requestCounter++;
  next();
});

// Seed Doctors Catalog
const doctors = [
  {
    id: 'doc-1',
    name: 'Dr. Elena Rostova',
    title: 'Senior Cardiologist & Heart Rhythm Specialist',
    department: 'Cardiology',
    avatar: 'images/doctors/dr-elena-rostova.jpg',
    experienceYears: 14,
    rating: 4.98,
    reviewCount: 312,
    hospital: 'Azure Metropolitan Heart Center',
    fee: 140,
    languages: ['English', 'French', 'Russian'],
    availability: 'Today',
    modes: ['video', 'in-person'],
    education: 'MD - Johns Hopkins University School of Medicine',
    bio: 'Pioneer in preventative cardiac health, arrhythmia management, and AI-assisted echocardiogram analysis.',
    slots: ['09:30 AM', '11:00 AM', '02:30 PM', '04:15 PM']
  },
  {
    id: 'doc-2',
    name: 'Dr. David Chen',
    title: 'Consultant Neurologist & Stroke Specialist',
    department: 'Neurology',
    avatar: 'images/doctors/dr-marcus-vance.jpg',
    experienceYears: 16,
    rating: 4.95,
    reviewCount: 268,
    hospital: 'Pacific Neurological Institute',
    fee: 160,
    languages: ['English', 'Mandarin'],
    availability: 'Today',
    modes: ['video', 'in-person'],
    education: 'MD, PhD - Harvard Medical School',
    bio: 'Specialist in migraine syndromes, neurological movement disorders, and cutting-edge cognitive diagnostics.',
    slots: ['10:00 AM', '11:45 AM', '03:15 PM', '05:00 PM']
  },
  {
    id: 'doc-3',
    name: 'Dr. Sarah Jensen',
    title: 'Clinical & Cosmetic Dermatologist',
    department: 'Dermatology',
    avatar: 'images/doctors/dr-sarah-jensen.jpg',
    experienceYears: 11,
    rating: 4.92,
    reviewCount: 420,
    hospital: 'DermaCare Advanced Medical Institute',
    fee: 115,
    languages: ['English', 'Spanish'],
    availability: 'Tomorrow',
    modes: ['video', 'in-person'],
    education: 'MD - Stanford University Medical Center',
    bio: 'Expert in dermatological oncology, eczema/psoriasis management, and AI computer vision lesion tracking.',
    slots: ['09:00 AM', '10:30 AM', '01:30 PM', '04:00 PM']
  },
  {
    id: 'doc-4',
    name: 'Dr. Marcus Vance',
    title: 'Chief of Pediatrics & Family Medicine',
    department: 'Pediatrics',
    avatar: 'images/doctors/dr-david-chen.jpg',
    experienceYears: 18,
    rating: 4.99,
    reviewCount: 540,
    hospital: 'Childrens Health & Family Wellness Clinic',
    fee: 95,
    languages: ['English', 'German'],
    availability: 'Today',
    modes: ['video', 'in-person'],
    education: 'MD - Columbia University College of Physicians',
    bio: 'Compassionate pediatric healthcare specialist focused on childhood development, preventative immunization, and adolescent medicine.',
    slots: ['08:45 AM', '11:15 AM', '02:00 PM', '03:45 PM']
  },
  {
    id: 'doc-5',
    name: 'Dr. Priya Sharma',
    title: 'Consultant Orthopedic Surgeon & Sports Medicine',
    department: 'Orthopedics',
    avatar: 'images/doctors/dr-elena-rostova.jpg',
    experienceYears: 13,
    rating: 4.94,
    reviewCount: 195,
    hospital: 'Azure Spine & Joint Reconstruction Institute',
    fee: 150,
    languages: ['English', 'Hindi'],
    availability: 'This Week',
    modes: ['video', 'in-person'],
    education: 'MS Ortho - Oxford University Medical Sciences',
    bio: 'Specialist in minimally invasive arthroscopy, sports trauma rehabilitation, and posture-related spinal ailments.',
    slots: ['10:15 AM', '01:00 PM', '03:30 PM']
  },
  {
    id: 'doc-6',
    name: 'Dr. Liam Montgomery',
    title: 'General Practitioner & Internal Medicine Specialist',
    department: 'General Medicine',
    avatar: 'images/doctors/dr-david-chen.jpg',
    experienceYears: 9,
    rating: 4.91,
    reviewCount: 380,
    hospital: 'St. Jude Community Health Hospital',
    fee: 75,
    languages: ['English'],
    availability: 'Today',
    modes: ['video', 'in-person'],
    education: 'MD - University of Washington School of Medicine',
    bio: 'Comprehensive primary care provider focused on chronic disease management, metabolic syndrome, and routine wellness screenings.',
    slots: ['09:15 AM', '11:30 AM', '01:45 PM', '04:30 PM']
  }
];

// Seed Appointments Catalog
let appointments = [
  {
    id: 'APT-AZ-1082',
    patientName: 'Alex Mercer',
    patientEmail: 'alex.mercer@example.com',
    patientPhone: '+1 (555) 234-8901',
    doctorId: 'doc-1',
    doctorName: 'Dr. Elena Rostova',
    department: 'Cardiology',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    time: '11:00 AM',
    mode: 'video',
    status: 'Confirmed',
    reason: 'Follow-up consultation on mild palpitations and exercise recovery',
    aiTriageNote: 'Low risk. Resting heart rate 74 bpm. Recommended routine ECG check.',
    meetingUrl: '/telehealth?room=APT-AZ-1082',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'APT-AZ-9941',
    patientName: 'Sophia Lin',
    patientEmail: 'sophia.lin@example.com',
    patientPhone: '+1 (555) 872-3104',
    doctorId: 'doc-3',
    doctorName: 'Dr. Sarah Jensen',
    department: 'Dermatology',
    date: new Date(Date.now() + 172800000).toISOString().split('T')[0], // 2 days out
    time: '01:30 PM',
    mode: 'in-person',
    status: 'Confirmed',
    reason: 'Annual skin mole screening and persistent contact rash on forearm',
    aiTriageNote: 'Mild allergic contact dermatitis suspected. Photos attached to medical record.',
    meetingUrl: null,
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
];

/**
 * -----------------------------------------------------------------------------
 * AI Doctor Platform REST APIs
 * -----------------------------------------------------------------------------
 */

// GET /api/doctors - List all doctors with optional filters
router.get('/api/doctors', (req, res) => {
  const { department, mode, search } = req.query;
  let results = [...doctors];

  if (department && department !== 'All') {
    results = results.filter(
      (d) => d.department.toLowerCase() === department.toLowerCase()
    );
  }

  if (mode && mode !== 'all') {
    results = results.filter((d) => d.modes.includes(mode.toLowerCase()));
  }

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.department.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.bio.toLowerCase().includes(q)
    );
  }

  res.status(200).json({
    success: true,
    count: results.length,
    doctors: results
  });
});

// GET /api/doctors/:id - Get specific doctor
router.get('/api/doctors/:id', (req, res) => {
  const doc = doctors.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Doctor not found' });
  }
  res.status(200).json({ success: true, doctor: doc });
});

// POST /api/ai/diagnose - Intelligent AI Symptom Triage & Specialist Matcher
router.post('/api/ai/diagnose', (req, res) => {
  const { symptoms, duration, severity, ageGroup } = req.body;

  if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length === 0) {
    return res.status(400).json({
      error: 'Symptoms description is required for AI triage analysis.'
    });
  }

  const text = symptoms.toLowerCase();
  let urgency = 'Routine';
  let badgeColor = 'green';
  let recommendedDept = 'General Medicine';
  let potentialConditions = [];
  let suggestedQuestions = [];
  let advice = [];

  // Medical Rule-Based Triage Engine
  if (
    text.includes('chest pain') ||
    text.includes('shortness of breath') ||
    text.includes('palpitation') ||
    text.includes('heart') ||
    text.includes('irregular pulse')
  ) {
    recommendedDept = 'Cardiology';
    urgency = text.includes('severe') || text.includes('crushing') ? 'Urgent' : 'Moderate';
    badgeColor = urgency === 'Urgent' ? 'red' : 'yellow';
    potentialConditions = [
      'Benign Cardiac Arrhythmia / Premature Ventricular Contractions',
      'Costochondritis (Chest Wall Inflammation)',
      'Cardiovascular Exertion Strain / Angina Pectoris'
    ];
    suggestedQuestions = [
      'Does the discomfort radiate to the jaw, neck, or left arm?',
      'Has there been a recent history of high blood pressure or cholesterol?',
      'Does resting alleviate the sensation?'
    ];
    advice = [
      'Avoid strenuous physical exertion and caffeine until evaluated.',
      'If you experience sudden severe crushing pressure radiating to your jaw or left arm, seek emergency medical care immediately.'
    ];
  } else if (
    text.includes('headache') ||
    text.includes('migraine') ||
    text.includes('dizz') ||
    text.includes('numb') ||
    text.includes('tingling') ||
    text.includes('vision blur')
  ) {
    recommendedDept = 'Neurology';
    urgency = text.includes('worst headache of life') || text.includes('numbness') ? 'Urgent' : 'Moderate';
    badgeColor = urgency === 'Urgent' ? 'red' : 'yellow';
    potentialConditions = [
      'Migraine with Visual Aura',
      'Cervicogenic Tension Headache',
      'Vestibular Migraine / Benign Paroxysmal Positional Vertigo'
    ];
    suggestedQuestions = [
      'Are you sensitive to bright lights or loud noises?',
      'Do you notice throbbing sensation primarily on one hemisphere of your head?',
      'Did symptoms begin after neck strain or screen eye-strain?'
    ];
    advice = [
      'Rest in a quiet, dark environment and hydrate adequately.',
      'Keep a symptom journal noting triggers, food intake, and sleep duration.'
    ];
  } else if (
    text.includes('rash') ||
    text.includes('itch') ||
    text.includes('skin') ||
    text.includes('mole') ||
    text.includes('eczema') ||
    text.includes('acne')
  ) {
    recommendedDept = 'Dermatology';
    urgency = 'Routine';
    badgeColor = 'green';
    potentialConditions = [
      'Contact Dermatitis / Allergic Eczema',
      'Urticaria (Acute Hives)',
      'Seborrheic Dermatitis'
    ];
    suggestedQuestions = [
      'Have you recently introduced new soaps, laundry detergents, or cosmetics?',
      'Is the rash spreading rapidly or accompanied by blistering?',
      'Is there any scaling, flaking, or localized swelling?'
    ];
    advice = [
      'Apply cool compresses and avoid scratching the irritated dermis.',
      'Take photos in bright natural light to share during your video consultation.'
    ];
  } else if (
    text.includes('child') ||
    text.includes('baby') ||
    text.includes('infant') ||
    text.includes('toddler') ||
    text.includes('pediatric')
  ) {
    recommendedDept = 'Pediatrics';
    urgency = text.includes('high fever') || text.includes('lethargic') ? 'Moderate' : 'Routine';
    badgeColor = urgency === 'Moderate' ? 'yellow' : 'green';
    potentialConditions = [
      'Pediatric Upper Respiratory Tract Viral Infection',
      'Viral Exanthem / Roseola',
      'Pediatric Acute Otitis Media'
    ];
    suggestedQuestions = [
      'How long has the child had the elevated temperature?',
      'Is the child maintaining normal hydration and wet diaper count?'
    ];
    advice = [
      'Monitor temperature with a digital thermometer and encourage small, frequent fluids.',
      'Have growth milestones and vaccination history ready for the pediatrician.'
    ];
  } else if (
    text.includes('knee') ||
    text.includes('joint') ||
    text.includes('back pain') ||
    text.includes('shoulder') ||
    text.includes('spine') ||
    text.includes('sprain')
  ) {
    recommendedDept = 'Orthopedics';
    urgency = text.includes('cannot bear weight') ? 'Moderate' : 'Routine';
    badgeColor = 'yellow';
    potentialConditions = [
      'Lumbar Muscular Strain / Facet Joint Syndrome',
      'Patellofemoral Pain Syndrome / Ligamentous Strain',
      'Tendinopathy / Bursitis'
    ];
    suggestedQuestions = [
      'Did a specific impact, twisting motion, or heavy lifting trigger this?',
      'Is there visible joint swelling or reduced range of motion?'
    ];
    advice = [
      'Apply R.I.C.E. protocol (Rest, Ice, Compression, Elevation) for 48 hours.',
      'Avoid high-impact workouts or twisting motions.'
    ];
  } else {
    recommendedDept = 'General Medicine';
    urgency = 'Routine';
    badgeColor = 'green';
    potentialConditions = [
      'Viral Upper Respiratory Infection',
      'General Fatigue / Metabolic Stress',
      'Seasonal Allergic Rhinitis'
    ];
    suggestedQuestions = [
      'How many days have these symptoms been present?',
      'Have you checked your body temperature or blood pressure recently?'
    ];
    advice = [
      'Ensure 8+ hours of restful sleep and drink at least 2 liters of water daily.',
      'Book a general consultation for complete physical examination and basic lab panel.'
    ];
  }

  // Find matching doctors for recommendation
  const matchedDoctors = doctors
    .filter((d) => d.department.toLowerCase() === recommendedDept.toLowerCase())
    .slice(0, 3);

  res.status(200).json({
    success: true,
    triageId: `TRIAGE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    urgency,
    badgeColor,
    recommendedDepartment: recommendedDept,
    confidenceScore: 0.94,
    clinicalAnalysis: `Based on your reported symptoms (${symptoms.substring(0, 80)}...), our medical AI triaged your case under ${recommendedDept} with a ${urgency.toLowerCase()} priority status.`,
    potentialConditions,
    suggestedQuestions,
    careAdvice: advice,
    matchedDoctors,
    disclaimer:
      'PulseAI is an intelligent healthcare decision-support tool, not an official diagnostic prescription. In life-threatening emergencies, call 911 or visit the nearest emergency room immediately.'
  });
});

// GET /api/appointments - List patient appointments
router.get('/api/appointments', (req, res) => {
  const { email, status } = req.query;
  let results = [...appointments];

  if (email) {
    results = results.filter((a) => a.patientEmail.toLowerCase() === email.toLowerCase());
  }

  if (status && status !== 'all') {
    results = results.filter((a) => a.status.toLowerCase() === status.toLowerCase());
  }

  // Sort newest first
  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.status(200).json({
    success: true,
    count: results.length,
    appointments: results
  });
});

// POST /api/appointments - Book a new appointment
router.post('/api/appointments', (req, res) => {
  const {
    doctorId,
    patientName,
    patientEmail,
    patientPhone,
    date,
    time,
    mode,
    reason,
    aiTriageNote
  } = req.body;

  if (!doctorId || !patientName || !patientEmail || !date || !time) {
    return res.status(400).json({
      error: 'Doctor ID, patient name, patient email, appointment date, and time are required.'
    });
  }

  const doctor = doctors.find((d) => d.id === doctorId);
  if (!doctor) {
    return res.status(404).json({ error: 'Selected doctor does not exist' });
  }

  const appointmentId = `APT-AZ-${Math.floor(1000 + Math.random() * 9000)}`;
  const newAppointment = {
    id: appointmentId,
    patientName,
    patientEmail,
    patientPhone: patientPhone || '+1 (555) 000-0000',
    doctorId: doctor.id,
    doctorName: doctor.name,
    department: doctor.department,
    doctorAvatar: doctor.avatar,
    hospital: doctor.hospital,
    fee: doctor.fee,
    date,
    time,
    mode: mode || 'video',
    status: 'Confirmed',
    reason: reason || 'General medical consultation',
    aiTriageNote: aiTriageNote || null,
    meetingUrl: mode === 'video' ? `/telehealth?room=${appointmentId}` : null,
    createdAt: new Date().toISOString()
  };

  appointments.unshift(newAppointment);

  res.status(201).json({
    success: true,
    message: 'Appointment successfully scheduled with Doctor',
    appointment: newAppointment
  });
});

// PATCH /api/appointments/:id - Cancel or Reschedule
router.patch('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  const { status, date, time } = req.body;

  const appt = appointments.find((a) => a.id === id);
  if (!appt) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  if (status) appt.status = status;
  if (date) appt.date = date;
  if (time) appt.time = time;
  appt.updatedAt = new Date().toISOString();

  res.status(200).json({
    success: true,
    message: `Appointment ${id} successfully updated`,
    appointment: appt
  });
});

// DELETE /api/appointments/:id - Cancel appointment
router.delete('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  const index = appointments.findIndex((a) => a.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  const cancelled = appointments.splice(index, 1)[0];
  res.status(200).json({
    success: true,
    message: `Appointment ${id} cancelled successfully`,
    appointment: cancelled
  });
});

/**
 * -----------------------------------------------------------------------------
 * Kubernetes Probes, Metrics & Telemetry (Preserved & Verified)
 * -----------------------------------------------------------------------------
 */

/**
 * Kubernetes Liveness Probe: /healthz
 */
router.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000)
  });
});

/**
 * Kubernetes Readiness Probe: /readyz
 */
router.get('/readyz', (req, res) => {
  const mem = process.memoryUsage();
  const isOverloaded = mem.heapUsed > 1024 * 1024 * 1024; // > 1GB

  if (isOverloaded) {
    return res.status(503).json({
      status: 'unready',
      reason: 'Memory pressure exceeds threshold'
    });
  }

  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      server: 'ok',
      memory: 'ok',
      storage: 'ok'
    }
  });
});

/**
 * Application & System Metrics: /metrics
 */
router.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  res.status(200).json({
    uptime: Math.floor((Date.now() - startTime) / 1000),
    totalRequests: requestCounter,
    memory: {
      rssMb: (mem.rss / (1024 * 1024)).toFixed(2),
      heapTotalMb: (mem.heapTotal / (1024 * 1024)).toFixed(2),
      heapUsedMb: (mem.heapUsed / (1024 * 1024)).toFixed(2),
      externalMb: (mem.external / (1024 * 1024)).toFixed(2)
    },
    system: {
      loadAverage: os.loadavg(),
      freeMemoryMb: (os.freemem() / (1024 * 1024)).toFixed(2),
      totalMemoryMb: (os.totalmem() / (1024 * 1024)).toFixed(2)
    }
  });
});

/**
 * Detailed Deployment & Cluster Info: /api/info
 */
router.get('/api/info', (req, res) => {
  res.status(200).json({
    application: {
      name: 'Azure GitHub Runner Demo App',
      platformTitle: 'AI Doctor Appointment Platform',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      framework: 'Express on Node.js'
    },
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      pid: process.pid,
      uptime: `${Math.floor((Date.now() - startTime) / 1000)}s`
    },
    infrastructure: {
      hostname: os.hostname(),
      cloudProvider: 'Microsoft Azure',
      ciRunner: 'Terraform-Provisioned GitHub Self-Hosted Runner VM',
      runnerLabels: ['self-hosted', 'linux', 'azure', 'docker']
    },
    kubernetes: {
      podName: process.env.POD_NAME || 'local-standalone-pod',
      podNamespace: process.env.POD_NAMESPACE || 'default',
      podIP: process.env.POD_IP || '127.0.0.1',
      nodeName: process.env.NODE_NAME || 'aks-nodepool1-vmss',
      clusterContext: process.env.K8S_CLUSTER_CONTEXT || 'aks-private-cluster'
    }
  });
});

/**
 * Real-time Telemetry for Frontend: /api/telemetry
 */
router.get('/api/telemetry', (req, res) => {
  const cpus = os.cpus();
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPercent = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);

  res.status(200).json({
    timestamp: new Date().toLocaleTimeString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    requestCount: requestCounter,
    cpuCount: cpus.length,
    cpuModel: cpus[0] ? cpus[0].model : 'Generic CPU',
    memoryUsagePercent: usedMemPercent,
    heapUsedMb: (mem.heapUsed / (1024 * 1024)).toFixed(1),
    heapTotalMb: (mem.heapTotal / (1024 * 1024)).toFixed(1),
    status: 'OPTIMAL'
  });
});

/**
 * Interactive API Test endpoint: /api/echo
 */
router.post('/api/echo', (req, res) => {
  res.status(200).json({
    message: 'Echo response received successfully from Azure Kubernetes cluster',
    receivedPayload: req.body || {},
    headersReceived: {
      host: req.headers.host,
      userAgent: req.headers['user-agent']
    },
    processedAt: new Date().toISOString()
  });
});

module.exports = router;
