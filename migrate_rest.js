const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = "task-widget-sync";
const VAULT_ID = "v1_9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b";

const rawData = fs.readFileSync(path.join(__dirname, 'data', 'tasks.json'), 'utf8');
const tasks = JSON.parse(rawData);

console.log(`🚚 Restoring ${tasks.length} tasks to Cloud Vault...`);

async function uploadTask(task) {
  return new Promise((resolve, reject) => {
    const docId = task.id;
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/private_vaults/${VAULT_ID}/user_tasks?documentId=${docId}`;

    const body = JSON.stringify({
      fields: {
        title: { stringValue: task.title },
        category: { stringValue: task.category || 'General' },
        priority: { stringValue: task.priority || 'medium' },
        completed: { booleanValue: !!task.completed },
        createdAt: { integerValue: task.createdAt ? new Date(task.createdAt).getTime().toString() : Date.now().toString() }
      }
    });

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Restored task: "${task.title}"`);
          resolve(true);
        } else {
          console.error(`⚠️ Status ${res.statusCode}:`, data);
          resolve(false);
        }
      });
    });

    req.on('error', err => {
      console.error(`❌ Error restoring "${task.title}":`, err);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

async function run() {
  for (const task of tasks) {
    await uploadTask(task);
  }
  console.log("🎉 All original tasks restored into Cloud Vault successfully!");
}

run();
