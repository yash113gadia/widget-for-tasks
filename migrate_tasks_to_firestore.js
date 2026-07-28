const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with project task-widget-sync
admin.initializeApp({
  projectId: "task-widget-sync"
});

const db = admin.firestore();
const VAULT_ID = "v1_9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b";
const tasksCollection = db.collection("private_vaults").doc(VAULT_ID).collection("user_tasks");

async function migrate() {
  console.log("🚚 Migrating tasks from data/tasks.json to Firestore Obscure Vault...");
  const rawData = fs.readFileSync(path.join(__dirname, 'data', 'tasks.json'), 'utf8');
  const tasks = JSON.parse(rawData);

  for (const task of tasks) {
    const docData = {
      title: task.title,
      category: task.category || 'General',
      priority: task.priority || 'medium',
      completed: !!task.completed,
      createdAt: task.createdAt ? new Date(task.createdAt).getTime() : Date.now()
    };
    await tasksCollection.doc(task.id).set(docData, { merge: true });
    console.log(`✅ Migrated: "${task.title}"`);
  }

  console.log("🎉 Migration Complete! All tasks restored into Cloud Vault.");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
