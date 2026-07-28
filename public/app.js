(function () {
  let tasks = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let ws = null;
  let isSoundEnabled = true;

  // DOM Elements
  const taskListEl = document.getElementById('taskList');
  const taskForm = document.getElementById('taskForm');
  const taskInput = document.getElementById('taskInput');
  const categoryInput = document.getElementById('categoryInput');
  const priorityInput = document.getElementById('priorityInput');
  const searchInput = document.getElementById('searchInput');
  const syncDot = document.getElementById('syncDot');
  const progressPercent = document.getElementById('progressPercent');
  const progressRingCircle = document.getElementById('progressRingCircle');
  const currentDateEl = document.getElementById('currentDate');
  const currentTimeEl = document.getElementById('currentTime');
  const addDrawer = document.getElementById('addDrawer');
  const toggleAddDrawerBtn = document.getElementById('toggleAddDrawerBtn');
  const bigPlusBtn = document.getElementById('bigPlusBtn');
  const navAddBtn = document.getElementById('navAddBtn');
  const qrBtn = document.getElementById('qrBtn');
  const soundBtn = document.getElementById('soundBtn');
  const qrModal = document.getElementById('qrModal');
  const closeQrBtn = document.getElementById('closeQrBtn');
  const qrImage = document.getElementById('qrImage');
  const networkUrl = document.getElementById('networkUrl');
  const navItems = document.querySelectorAll('.bottom-nav .nav-item[data-filter]');

  // Live Date & Time Updater
  function updateLiveClock() {
    const now = new Date();
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'short' };
    currentDateEl.textContent = now.toLocaleDateString('en-US', dateOptions);
    
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    currentTimeEl.textContent = `${hours}:${minutes}${ampm}`;
  }

  setInterval(updateLiveClock, 1000);
  updateLiveClock();

  // Toggle Add Drawer
  function toggleDrawer() {
    addDrawer.classList.toggle('open');
    if (addDrawer.classList.contains('open')) {
      taskInput.focus();
    }
  }

  toggleAddDrawerBtn.addEventListener('click', toggleDrawer);

  // Web Audio Chime Sound
  function playCompletionChime() {
    if (!isSoundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  // WebSocket Connection
  function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      syncDot.className = 'sync-dot online';
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'INIT':
          case 'TASKS_UPDATED':
            tasks = data.payload || [];
            renderTasks();
            break;
          case 'TASK_ADDED':
            tasks.unshift(data.payload);
            renderTasks();
            break;
          default:
            break;
        }
      } catch (err) {}
    };

    ws.onclose = () => {
      syncDot.className = 'sync-dot offline';
      setTimeout(initWebSocket, 2000);
    };
  }

  // Calculate Progress Ring
  function updateProgressRing() {
    const circumference = 81.68;
    if (tasks.length === 0) {
      progressPercent.textContent = '0%';
      progressRingCircle.style.strokeDashoffset = circumference;
      return;
    }

    const completed = tasks.filter(t => t.completed).length;
    const percent = Math.round((completed / tasks.length) * 100);
    progressPercent.textContent = `${percent}%`;

    const offset = circumference - (percent / 100) * circumference;
    progressRingCircle.style.strokeDashoffset = offset;
  }

  // Filter Tasks
  function getFilteredTasks() {
    return tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (currentFilter === 'active') return !task.completed;
      if (currentFilter === 'completed') return task.completed;
      return true;
    });
  }

  // Render Tasks
  function renderTasks() {
    updateProgressRing();
    const filtered = getFilteredTasks();

    if (filtered.length === 0) {
      taskListEl.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: var(--text-sub);">
          <p style="font-size: 0.9rem; font-weight: 600; color: var(--text-main);">No tasks found</p>
          <p style="font-size: 0.78rem; margin-top: 4px; color: var(--text-muted);">Click (+) to add a new task</p>
        </div>
      `;
      return;
    }

    taskListEl.innerHTML = filtered
      .map((task) => {
        let barClass = 'bar-coral';
        if (task.priority === 'high' || task.category === 'Work') barClass = 'bar-pink';
        if (task.priority === 'low' || task.category === 'Learning') barClass = 'bar-cyan';

        const timeString = task.createdAt 
          ? new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'TODAY';

        return `
          <div class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-card-accent-bar ${barClass}"></div>
            <div class="task-card-body">
              <div class="task-card-left">
                <div class="task-card-title">${escapeHtml(task.title)}</div>
                <div class="task-card-time">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>${timeString}</span>
                </div>
              </div>
              <div class="task-card-right">
                <button class="card-options-btn" data-action="delete" title="Delete">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
                <div class="card-checkbox" data-action="toggle">
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Submit New Task
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) return;

    const payload = {
      title,
      category: categoryInput.value,
      priority: priorityInput.value
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ADD_TASK', payload }));
    }

    taskInput.value = '';
    addDrawer.classList.remove('open');
  });

  // Search Bar Filter
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderTasks();
  });

  // Task Actions (Toggle / Delete)
  taskListEl.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const card = target.closest('.task-card');
    if (!card) return;

    const id = card.getAttribute('data-id');
    const action = target.getAttribute('data-action');

    if (action === 'toggle') {
      const task = tasks.find(t => t.id === id);
      if (task && !task.completed) {
        playCompletionChime();
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'TOGGLE_TASK', payload: { id } }));
      }
    } else if (action === 'delete') {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'DELETE_TASK', payload: { id } }));
      }
    }
  });

  // Navigation Filter Tabs
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      currentFilter = item.getAttribute('data-filter');
      renderTasks();
    });
  });

  // Sound Toggle
  soundBtn.addEventListener('click', () => {
    isSoundEnabled = !isSoundEnabled;
    soundBtn.style.color = isSoundEnabled ? 'var(--accent-pink)' : 'var(--text-dim)';
  });

  // QR Code Modal
  qrBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/network-info');
      const data = await res.json();
      qrImage.src = data.qrDataUrl;
      networkUrl.textContent = data.url;
      qrModal.classList.add('open');
    } catch (e) {
      networkUrl.textContent = window.location.href;
      qrModal.classList.add('open');
    }
  });

  closeQrBtn.addEventListener('click', () => {
    qrModal.classList.remove('open');
  });

  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.classList.remove('open');
  });

  // Init
  initWebSocket();
})();
