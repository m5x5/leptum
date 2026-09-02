# Leptum - Personal Productivity Tracker

A Next.js application for tracking habits, goals, and personal metrics with user-owned storage in a Solid Pod.

---

## What does this project do?

Leptum is a **personal productivity tracker** that runs entirely in your browser. It helps you:

- **Track habits and routines** – Create recurring tasks with CRON-style scheduling and mark them done.
- **Manage goals** – Set goals, categorize them by type, and track progress.
- **Log impact and time** – Record daily activities and metrics; optionally import [ActivityWatch](https://activitywatch.net/) data to see app/editor usage alongside manual entries on a timeline.

All of this works without an app backend: data is stored in your own Solid Pod and syncs across devices when you’re online.

---

## Why is this project useful?

- **You own your data** – Nothing is stored on our servers. You choose the Solid Pod where it lives.
- **Works offline** – Use the app without internet; changes sync when you’re back online.
- **No database or app backend** – No MongoDB, no API server. The app reads and writes directly to your Solid Pod.
- **Privacy and control** – Your habits, goals, and logs stay under your control and in your storage.
- **Cross-device** – Same data on all your devices through your chosen Solid provider.

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

### Connect your Solid Pod (first-time use)

1. Open **Settings**.
2. Enter your Solid identity provider or use the default.
3. Authorize the app to read/write in your pod.
4. Start creating routines, goals, tasks, and timeline entries; they’ll sync to your pod automatically.

### Other useful commands

```bash
npm run build   # Production build
npm start       # Run production server
npx tsc --noEmit  # Type check
```

---

## Where can I get more help?

- **Bugs and feature ideas** – Open an [issue](https://github.com/m5x5/leptum/issues) in this repository.
- **Solid** – [solidproject.org](https://solidproject.org/) for protocol and pod provider information.
- **ActivityWatch** – [activitywatch.net](https://activitywatch.net/) for the time-tracking integration.
- **Contributing** – Contributions are welcome; see the repository for guidelines.

---

## More details

### Supported storage providers

| Provider        | Notes                          |
|----------------|---------------------------------|
| Any Solid Pod provider | Use a hosted Solid identity and pod |
| Self-hosted Solid      | Run your own Solid server |

### Data stored in Solid

- **Goals** (`/leptum/goals/*`) – Personal goals and targets  
- **Goal Types** (`/leptum/goal-types/*`) – Categories for goals  
- **Tasks and routines** (`/leptum/tasks/*`) – One-off tasks and scheduled routines
- **Impacts** (`/leptum/events/*`) – Daily metrics and timeline entries
- **Notes, photos, ActivityWatch, health, and settings** – Stored as RDF resources and binary resources in Leptum containers

### Architecture (high level)

- **`lib/remoteStorage.ts`** – Compatibility facade over Solid-backed storage  
- **`lib/solidRdf/` + `shapes/`** – Solid RDF backends, Turtle writers, and ShEx/LDO readers
- **`app/`** – Next.js pages (App Router)  
- **`components/`** – Shared UI and feature components  
- **`utils/`** – Hooks and helpers (e.g. goals, routines, ActivityWatch)  

### Privacy and security

- No central database; your data does not go through our servers.
- You choose where data lives (provider and account).
- Open source so you can inspect how data is handled.
- Built on Solid, RDF, Turtle, and ShEx/LDO typed shapes.

---

## License

MIT License.
