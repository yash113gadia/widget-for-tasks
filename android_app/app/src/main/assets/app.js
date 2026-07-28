(function () {
  let tasks = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let isSoundEnabled = true;

  // Firebase Config for task-widget-sync
  const firebaseConfig = {
    apiKey: "AIzaSyDl2ioW-WbmLJlmgo3jvEsCBwiITVcgZhs",
    authDomain: "task-widget-sync.firebaseapp.com",
    projectId: "task-widget-sync",
    storageBucket: "task-widget-sync.firebasestorage.app",
    messagingSenderId: "24764226157",
    appId: "1:24764226157:web:76450f14bdfc9dbabf3d64"
  };

  // Initialize Firebase & Obscure Private Vault Collection
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  
  // Enable offline caching for 0ms initial load and true offline support
  db.enablePersistence()
    .catch((err) => {
        console.error("Firestore persistence error:", err.code);
    });
  
  const VAULT_ID = "v1_9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b";
  const tasksCollection = db.collection("private_vaults").doc(VAULT_ID).collection("user_tasks");

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
  const soundBtn = document.getElementById('soundBtn');
  const sectionTitle = document.getElementById('sectionTitle');
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

  // Firebase Real-time Listener for Private Vault
  function initFirestoreSync() {
    tasksCollection.orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      syncDot.className = 'sync-dot online';
      tasks = [];
      snapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      renderTasks();
    }, (error) => {
      console.error("Firestore sync error:", error);
      syncDot.className = 'sync-dot offline';
    });
  }

  // Calculate Progress Ring (Only non-deleted tasks)
  function updateProgressRing() {
    const activeNonDeleted = tasks.filter(t => !t.deleted);
    const circumference = 81.68;
    if (activeNonDeleted.length === 0) {
      progressPercent.textContent = '0%';
      progressRingCircle.style.strokeDashoffset = circumference;
      return;
    }

    const completed = activeNonDeleted.filter(t => t.completed).length;
    const percent = Math.round((completed / activeNonDeleted.length) * 100);
    progressPercent.textContent = `${percent}%`;

    const offset = circumference - (percent / 100) * circumference;
    progressRingCircle.style.strokeDashoffset = offset;
  }

  // Filter Tasks (Active / Completed / Trash)
  function getFilteredTasks() {
    return tasks.filter((task) => {
      const matchesSearch = (task.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (currentFilter === 'trash') {
        return !!task.deleted;
      }
      
      // For non-trash tabs, exclude deleted tasks
      if (task.deleted) return false;

      if (currentFilter === 'active') return !task.completed;
      if (currentFilter === 'completed') return task.completed;
      return true;
    });
  }

  // Render Tasks
  function renderTasks() {
    updateProgressRing();
    const filtered = getFilteredTasks();

    if (currentFilter === 'trash') {
      sectionTitle.textContent = 'Recently Deleted';
    } else if (currentFilter === 'active') {
      sectionTitle.textContent = 'Active';
    } else if (currentFilter === 'completed') {
      sectionTitle.textContent = 'Completed';
    } else {
      sectionTitle.textContent = 'Today';
    }

    if (filtered.length === 0) {
      const emptyMsg = currentFilter === 'trash' ? 'Trash is empty' : 'No tasks found';
      taskListEl.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: var(--text-sub);">
          <p style="font-size: 0.9rem; font-weight: 600; color: var(--text-main);">${emptyMsg}</p>
          <p style="font-size: 0.78rem; margin-top: 4px; color: var(--text-muted);">${currentFilter === 'trash' ? 'Deleted tasks appear here' : 'Click (+) to add a new task'}</p>
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

        const isTrashView = currentFilter === 'trash';

        return `
          <div class="task-card ${task.completed ? 'completed' : ''} ${isTrashView ? 'in-trash' : ''}" data-id="${task.id}">
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
                ${isTrashView ? `
                  <!-- Restore Button -->
                  <button class="card-action-btn restore-btn" data-action="restore" title="Restore Task">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                  </button>
                  <!-- Permanent Delete Button -->
                  <button class="card-action-btn purge-btn" data-action="purge" title="Delete Permanently">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                ` : `
                  <!-- Move to Recently Deleted Button -->
                  <button class="card-action-btn trash-btn" data-action="trash" title="Move to Trash">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                  <div class="card-checkbox" data-action="toggle" title="Toggle Done">
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                `}
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
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) return;

    const newTask = {
      title,
      category: categoryInput.value,
      priority: priorityInput.value,
      completed: false,
      deleted: false,
      createdAt: Date.now()
    };

    try {
      await tasksCollection.add(newTask);
      taskInput.value = '';
      addDrawer.classList.remove('open');
    } catch (err) {
      console.error("Error adding task:", err);
    }
  });

  // Search Bar Filter
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderTasks();
  });

  // Task Actions (Toggle / Move to Trash / Restore / Permanent Purge)
  taskListEl.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const card = target.closest('.task-card');
    if (!card) return;

    const id = card.getAttribute('data-id');
    const action = target.getAttribute('data-action');

    if (action === 'toggle') {
      const task = tasks.find(t => t.id === id);
      if (task) {
        if (!task.completed) playCompletionChime();
        try {
          await tasksCollection.doc(id).update({ completed: !task.completed });
        } catch (err) {
          console.error("Error updating task:", err);
        }
      }
    } else if (action === 'trash') {
      // Soft Delete: Move to Recently Deleted (Trash Bin)
      try {
        await tasksCollection.doc(id).update({ deleted: true, deletedAt: Date.now() });
      } catch (err) {
        console.error("Error moving task to trash:", err);
      }
    } else if (action === 'restore') {
      // Restore task from Trash Bin back to active
      try {
        await tasksCollection.doc(id).update({ deleted: false });
      } catch (err) {
        console.error("Error restoring task:", err);
      }
    } else if (action === 'purge') {
      // Permanent Delete from Cloud Vault
      try {
        await tasksCollection.doc(id).delete();
      } catch (err) {
        console.error("Error purging task:", err);
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
    soundBtn.style.color = isSoundEnabled ? 'var(--accent-primary)' : 'var(--text-muted)';
  });

  // Init
  initFirestoreSync();
})();
