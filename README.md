# Leptum - Personal Productivity Tracker

A Next.js application for tracking habits, goals, and personal metrics with **local-first data storage** powered by [RemoteStorage.js](https://remotestorage.io/).

## 🌟 Key Features

- **🔒 User-Owned Data**: Your data stays with you - choose your own storage provider
- **☁️ Cross-Device Sync**: Access your data from any device, anywhere
- **📱 Local-First**: Works without internet, syncs when you're back online
- **🎯 Habit Tracking**: Create and track recurring tasks with CRON scheduling
- **📊 Goal Management**: Set and monitor personal goals
- **📈 Impact Logging**: Track your daily metrics and progress
- **🏗️ Stack Management**: Organize your workflows

## 🚀 RemoteStorage Integration

This app uses **RemoteStorage.js** to give you complete control over your data:

### Supported Storage Providers
- **[5apps](https://5apps.com/)** - Free RemoteStorage hosting
- **[Dropbox](https://dropbox.com)** - Use your existing Dropbox account  
- **[Google Drive](https://drive.google.com)** - Store data in your Google Drive
- **Self-hosted** - Run your own RemoteStorage server

### How to Connect Your Storage

1. **Start the app** - Look for the RemoteStorage widget in the top-right corner
2. **Click the widget** to open the connection dialog
3. **Choose your provider**:
   - For 5apps: Enter your username like `username@5apps.com`
   - For Dropbox/Google: Follow the OAuth flow
   - For self-hosted: Enter your server URL
4. **Authorize access** - Grant permission for the app to store data
5. **Start using** - Your data will automatically sync across devices!

## 🛠️ Development

### Prerequisites
- Node.js 16+ and npm
- No database required! 🎉

### Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd leptum

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the app.

### Architecture

```
📁 lib/remoteStorage.ts    # RemoteStorage client & schemas
📁 components/             # React components  
📁 pages/                  # Next.js pages (no API routes needed!)
📁 utils/                  # Utility functions & hooks
```

## 🔧 Previous vs New Storage

| Feature | Before (Prisma + MongoDB) | After (RemoteStorage.js) |
|---------|---------------------------|--------------------------|
| **Data Ownership** | Stored on your servers | User controls their data |
| **Backend Required** | Yes (MongoDB + API) | No backend needed |
| **Offline Support** | Limited | Full local-first |
| **Cross-Device Sync** | Manual implementation | Built-in automatic sync |
| **Privacy** | Data on your servers | Data stays with user |
| **Maintenance** | Database + server upkeep | Zero backend maintenance |

## 📋 Data Structure

The app stores the following data types in RemoteStorage:

- **Jobs** (`/leptum/jobs/*`) - Scheduled habits and tasks
- **Goals** (`/leptum/goals/*`) - Personal goals and targets  
- **Goal Types** (`/leptum/goal-types/*`) - Categories for goals
- **Impacts** (`/leptum/impacts`) - Daily metrics and measurements
- **Stacks** (`/leptum/stacks/*`) - Workflow organization

## 🔒 Privacy & Security

- **No central database** - Your data never touches our servers
- **End-to-end control** - You choose where your data lives
- **Open source** - Full transparency in data handling
- **Standards-based** - Uses open RemoteStorage protocol

## 🤝 Contributing

This app demonstrates the power of user-owned data and local-first applications. Contributions welcome!

## 📄 License

MIT License - Build something amazing! 🌟

### Todonna Integration

Leptum now supports syncing tasks with other apps that use the [todonna](http://remotestorage.io/spec/modules/todonna/) RemoteStorage specification. This allows you to:

- **Import tasks** from other todonna-compatible apps
- **Export your tasks** to be accessible by other apps
- **Automatic sync** when you create, update, or delete tasks

#### How it Works

1. **Automatic Sync**: Every time you add, update, or delete a task, it's automatically synced to your todonna storage
2. **Import on Load**: When the app loads, it automatically imports any new tasks from todonna

#### Task Mapping

Your Leptum tasks are converted to the todonna format:
- `name` → `todo_item_text`
- `id` → `todo_item_id`
- `status` → `todo_item_status` (mapped: `due`→`todo`, `completed`→`done`, `pending`→`pending`)
- `@context` → `http://remotestorage.io/spec/modules/todonna/aTodoItem`

#### Usage

1. Connect your RemoteStorage account
2. Create tasks in Leptum - they're automatically synced to todonna
3. Tasks from other todonna apps will appear automatically in your Quick Tasks section
