# Leptum - Personal Productivity Tracker

A Next.js application for tracking habits, goals, and personal metrics with **local-first data storage** powered by [RemoteStorage.js](https://remotestorage.io/).

---

## What does this project do?

Leptum is a **personal productivity tracker** that runs entirely in your browser. It helps you:

- **Track habits and routines** – Create recurring tasks with CRON-style scheduling and mark them done.
- **Manage goals** – Set goals, categorize them by type, and track progress.
- **Log impact and time** – Record daily activities and metrics; optionally import [ActivityWatch](https://activitywatch.net/) data to see app/editor usage alongside manual entries on a timeline.

All of this works **without a backend**: data is stored in your own RemoteStorage (e.g. 5apps, Dropbox, Google Drive, or self-hosted) and syncs across devices when you’re online, and works offline when you’re not.

---

## Why is this project useful?

- **You own your data** – Nothing is stored on our servers. You choose where it lives (5apps, Dropbox, Google Drive, or your own server).
- **Works offline** – Use the app without internet; changes sync when you’re back online.
- **No database or backend** – No MongoDB, no API server. Everything runs client-side via RemoteStorage.
- **Privacy and control** – Your habits, goals, and logs stay under your control and in your storage.
- **Cross-device** – Same data on all your devices through your chosen RemoteStorage provider.

---

## How do I get started?

### Prerequisites

- **Node.js 16+** and npm
- No database or backend setup required

### Run the app locally

```bash
# Clone the repository
git clone <your-repo-url>
cd leptum

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open **http://localhost:3000** in your browser.

### Connect your storage (first-time use)

1. Find the **RemoteStorage widget** (e.g. in the top-right).
2. **Click it** to open the connection dialog.
3. **Pick a provider**:
   - **5apps** – Free hosting: use something like `username@5apps.com`
   - **Dropbox / Google Drive** – Follow the OAuth steps
   - **Self-hosted** – Enter your RemoteStorage server URL
4. **Authorize** the app to read/write in your storage.
5. Start creating routines, goals, and impacts; they’ll sync to your storage automatically.

### Other useful commands

```bash
npm run build   # Production build
npm start       # Run production server
npx tsc --noEmit  # Type check
```

---

## Where can I get more help?

- **Bugs and feature ideas** – Open an [issue](https://github.com/m5x5/leptum/issues) in this repository.
- **RemoteStorage** – [remotestorage.io](https://remotestorage.io/) for protocol docs, [5apps](https://5apps.com/) for free hosting.
- **ActivityWatch** – [activitywatch.net](https://activitywatch.net/) for the time-tracking integration.
- **Contributing** – Contributions are welcome; see the repository for guidelines.

---

## More details

### Supported storage providers

| Provider        | Notes                          |
|----------------|---------------------------------|
| [5apps](https://5apps.com/)        | Free RemoteStorage hosting      |
| [Dropbox](https://dropbox.com)     | Use your existing account       |
| [Google Drive](https://drive.google.com) | Store data in Drive        |
| Self-hosted     | Your own RemoteStorage server   |

### Data stored in RemoteStorage

- **Jobs** (`/leptum/jobs/*`) – Scheduled habits and tasks  
- **Goals** (`/leptum/goals/*`) – Personal goals and targets  
- **Goal Types** (`/leptum/goal-types/*`) – Categories for goals  
- **Impacts** (`/leptum/impacts`) – Daily metrics and timeline entries  
- **Stacks** (`/leptum/stacks/*`) – Workflow organization  

### Todonna integration

Leptum can sync tasks with other apps using the [Todonna](http://remotestorage.io/spec/modules/todonna/) spec:

- Tasks you create, update, or delete in Leptum sync to your Todonna storage.
- Tasks from other Todonna apps can appear in Leptum (e.g. Quick Tasks).
- Mapping: Leptum `name` → `todo_item_text`, `status` → `todo_item_status` (e.g. `due`→`todo`, `completed`→`done`).

### Architecture (high level)

- **`lib/remoteStorage.ts`** – RemoteStorage client and data schemas  
- **`app/`** – Next.js pages (App Router)  
- **`components/`** – Shared UI and feature components  
- **`utils/`** – Hooks and helpers (e.g. goals, routines, ActivityWatch)  

### Privacy and security

- No central database; your data does not go through our servers.
- You choose where data lives (provider and account).
- Open source so you can inspect how data is handled.
- Built on the open RemoteStorage protocol.

---

## License

MIT License.
