// Service Worker registration and update management

export interface ServiceWorkerState {
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  installing: boolean;
  waiting: boolean;
  active: boolean;
}

type ServiceWorkerListener = (state: ServiceWorkerState) => void;

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private listeners: Set<ServiceWorkerListener> = new Set();
  private updateAvailable = false;

  async register(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[SW Manager] Service Workers not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.registration = registration;
      this.setupListeners(registration);
      this.notifyListeners();

      console.log('[SW Manager] Service Worker registered:', registration.scope);
      return registration;
    } catch (error) {
      console.error('[SW Manager] Service Worker registration failed:', error);
      return null;
    }
  }

  private setupListeners(registration: ServiceWorkerRegistration) {
    // Check for updates immediately
    registration.update();

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      console.log('[SW Manager] Update found');
      const newWorker = registration.installing;
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is waiting
            this.updateAvailable = true;
            this.notifyListeners();
            console.log('[SW Manager] New service worker available');
          }
        });
      }
    });

    // Listen for controller change (when new SW takes over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW Manager] Controller changed - reloading page');
      window.location.reload();
    });
  }

  async checkForUpdates(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      await this.registration.update();
      return this.updateAvailable;
    } catch (error) {
      console.error('[SW Manager] Error checking for updates:', error);
      return false;
    }
  }

  async skipWaiting(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      return;
    }

    // Send message to waiting service worker to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  getState(): ServiceWorkerState {
    return {
      registration: this.registration,
      updateAvailable: this.updateAvailable,
      installing: this.registration?.installing !== undefined,
      waiting: this.registration?.waiting !== undefined,
      active: this.registration?.active !== undefined,
    };
  }

  subscribe(listener: ServiceWorkerListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
}

export const serviceWorkerManager = new ServiceWorkerManager();
