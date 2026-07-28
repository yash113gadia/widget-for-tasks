const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const qrcode = require('qrcode');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default tasks if none exist
const DEFAULT_TASKS = [
  {
    id: uuidv4(),
    title: 'Welcome to Synced Task Widget',
    category: 'Work',
    priority: 'high',
    completed: false,
    dueDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'Scan QR code to sync on Pixel',
    category: 'Personal',
    priority: 'medium',
    completed: false,
    dueDate: '',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'Try toggling widget view on MacBook',
    category: 'Personal',
    priority: 'low',
    completed: true,
    dueDate: '',
    createdAt: new Date().toISOString()
  }
];

// Helper to read tasks
function readTasks() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_TASKS, null, 2));
      return DEFAULT_TASKS;
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading tasks:', err);
    return DEFAULT_TASKS;
  }
}

// Helper to save tasks
function saveTasks(tasks) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
  } catch (err) {
    console.error('Error saving tasks:', err);
  }
}

// Get local IPv4 addresses for pairing
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Broadcast helper to all connected clients
function broadcast(data, senderWs = null) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client !== senderWs) {
      client.send(message);
    }
  });
}

// WebSocket Connection handling
wss.on('connection', (ws) => {
  console.log('⚡ New client connected (Pixel or MacBook)');
  
  // Send current tasks immediately upon connection
  const tasks = readTasks();
  ws.send(JSON.stringify({ type: 'INIT', payload: tasks }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      let tasks = readTasks();

      switch (data.type) {
        case 'ADD_TASK': {
          const newTask = {
            id: uuidv4(),
            title: data.payload.title || 'Untitled Task',
            category: data.payload.category || 'General',
            priority: data.payload.priority || 'medium',
            completed: false,
            dueDate: data.payload.dueDate || '',
            createdAt: new Date().toISOString()
          };
          tasks.unshift(newTask);
          saveTasks(tasks);
          broadcast({ type: 'TASK_ADDED', payload: newTask });
          ws.send(JSON.stringify({ type: 'TASK_ADDED_CONFIRM', payload: newTask }));
          break;
        }

        case 'TOGGLE_TASK': {
          tasks = tasks.map(t => t.id === data.payload.id ? { ...t, completed: !t.completed } : t);
          saveTasks(tasks);
          broadcast({ type: 'TASKS_UPDATED', payload: tasks });
          ws.send(JSON.stringify({ type: 'TASKS_UPDATED', payload: tasks }));
          break;
        }

        case 'DELETE_TASK': {
          tasks = tasks.filter(t => t.id !== data.payload.id);
          saveTasks(tasks);
          broadcast({ type: 'TASKS_UPDATED', payload: tasks });
          ws.send(JSON.stringify({ type: 'TASKS_UPDATED', payload: tasks }));
          break;
        }

        case 'UPDATE_TASK': {
          tasks = tasks.map(t => t.id === data.payload.id ? { ...t, ...data.payload } : t);
          saveTasks(tasks);
          broadcast({ type: 'TASKS_UPDATED', payload: tasks });
          ws.send(JSON.stringify({ type: 'TASKS_UPDATED', payload: tasks }));
          break;
        }

        case 'REORDER_TASKS': {
          if (Array.isArray(data.payload)) {
            saveTasks(data.payload);
            broadcast({ type: 'TASKS_UPDATED', payload: data.payload });
            ws.send(JSON.stringify({ type: 'TASKS_UPDATED', payload: data.payload }));
          }
          break;
        }

        case 'CLEAR_COMPLETED': {
          tasks = tasks.filter(t => !t.completed);
          saveTasks(tasks);
          broadcast({ type: 'TASKS_UPDATED', payload: tasks });
          ws.send(JSON.stringify({ type: 'TASKS_UPDATED', payload: tasks }));
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error processing WS message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// REST API Endpoints
app.get('/api/tasks', (req, res) => {
  res.json(readTasks());
});

app.post('/api/tasks', (req, res) => {
  const tasks = readTasks();
  const newTask = {
    id: uuidv4(),
    title: req.body.title || 'Untitled Task',
    category: req.body.category || 'General',
    priority: req.body.priority || 'medium',
    completed: false,
    dueDate: req.body.dueDate || '',
    createdAt: new Date().toISOString()
  };
  tasks.unshift(newTask);
  saveTasks(tasks);
  broadcast({ type: 'TASKS_UPDATED', payload: tasks });
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  let tasks = readTasks();
  const id = req.params.id;
  tasks = tasks.map(t => t.id === id ? { ...t, ...req.body } : t);
  saveTasks(tasks);
  broadcast({ type: 'TASKS_UPDATED', payload: tasks });
  res.json({ success: true, tasks });
});

app.delete('/api/tasks/:id', (req, res) => {
  let tasks = readTasks();
  tasks = tasks.filter(t => t.id !== req.params.id);
  saveTasks(tasks);
  broadcast({ type: 'TASKS_UPDATED', payload: tasks });
  res.json({ success: true });
});

// Network connection info & QR Code generation
app.get('/api/network-info', async (req, res) => {
  const ips = getLocalIPs();
  const primaryIp = ips[0] || 'localhost';
  const url = `http://${primaryIp}:${PORT}`;
  
  try {
    const qrDataUrl = await qrcode.toDataURL(url, { margin: 2, width: 250 });
    res.json({
      port: PORT,
      ips,
      primaryIp,
      url,
      qrDataUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'QR Code generation failed' });
  }
});

server.listen(PORT, () => {
  const ips = getLocalIPs();
  console.log(`\n==================================================`);
  console.log(`🚀 Task Sync Server is running on Port ${PORT}`);
  console.log(`💻 Local (MacBook): http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`📱 Mobile (Pixel LAN URL): http://${ips[0]}:${PORT}`);
  }
  console.log(`==================================================\n`);
});
