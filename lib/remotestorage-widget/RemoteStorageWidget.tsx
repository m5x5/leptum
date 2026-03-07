/**
 * RemoteStorageWidget — headless React compound components
 *
 * Radix UI-style: pure logic + state, zero styling. Compose with your own
 * classes or use DefaultWidget for a ready-made Tailwind-styled version.
 *
 * Usage:
 *   import { RemoteStorageWidget as RSW, useRSWidget } from './RemoteStorageWidget';
 *
 *   <RSW.Root rs={rs}>
 *     <RSW.Icon>…logo…</RSW.Icon>
 *     <RSW.InitialView>…</RSW.InitialView>
 *     <RSW.ConnectedView>…</RSW.ConnectedView>
 *     <RSW.SignInView><RSW.ConnectForm /></RSW.SignInView>
 *     <RSW.ChooseView>…</RSW.ChooseView>
 *     <RSW.ErrorView>…</RSW.ErrorView>
 *   </RSW.Root>
 */
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ButtonHTMLAttributes,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface RemoteStorage {
  apiKeys: Record<string, unknown>;
  backend: string;
  remote: { userAddress: string };
  on(event: string, handler: (...args: unknown[]) => void): void;
  connect(userAddress: string): void;
  disconnect(): void;
  reconnect(): void;
  startSync(): void;
  stopSync(): void;
  hasFeature(feature: string): boolean;
  dropbox?: { connect(): void };
  googledrive?: { connect(): void };
}

export type WidgetPanel =
  | "initial"
  | "choose"
  | "sign-in"
  | "connected"
  | "error";

export interface WidgetState {
  /** Which content panel is currently shown */
  panel: WidgetPanel;
  /** Widget is collapsed to icon-only */
  closed: boolean;
  /** Network is online */
  online: boolean;
  /** A storage backend is connected */
  active: boolean;
  /** Current backend: "remotestorage" | "dropbox" | "googledrive" | null */
  backend: string | null;
  /** Sync is currently in progress */
  syncing: boolean;
  /** Backend supports sync */
  syncEnabled: boolean;
  /** Connected user address */
  user: string;
  /** Sub-headline text in the connected view */
  statusText: string;
  /** Error message shown in the error view */
  errorMessage: string;
  /** Whether to show the "Renew" reconnect link in the error view */
  showReconnect: boolean;
  /** Discovery error message from sign-in */
  discoveryError: string | null;
  /** Connect form is submitting */
  connecting: boolean;
  /** Widget has a modal backdrop */
  modal: boolean;
  /** Skip initial hint; go straight to choose/sign-in */
  skipInitial: boolean;
  /** Whether API keys (Dropbox/Drive) are configured */
  hasApiKeys: boolean;
}

export interface WidgetActions {
  open(): void;
  close(): void;
  toggle(): void;
  showSignIn(): void;
  showChoose(): void;
  showChooseOrSignIn(): void;
  connect(userAddress: string): void;
  disconnect(): void;
  reconnect(): void;
  startSync(): void;
  stopSync(): void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface RSWidgetContextValue {
  state: WidgetState;
  actions: WidgetActions;
  rs: RemoteStorage;
}

const RSWidgetContext = createContext<RSWidgetContextValue | null>(null);

export function useRSWidget(): RSWidgetContextValue {
  const ctx = useContext(RSWidgetContext);
  if (!ctx)
    throw new Error("useRSWidget must be used within RemoteStorageWidget.Root");
  return ctx;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_PANEL"; panel: WidgetPanel }
  | { type: "SET_CLOSED"; closed: boolean }
  | { type: "SET_MODAL"; modal: boolean }
  | { type: "CONNECTED"; user: string; backend: string; syncEnabled: boolean }
  | { type: "DISCONNECTED" }
  | { type: "NETWORK_ONLINE" }
  | { type: "NETWORK_OFFLINE" }
  | { type: "SYNC_STARTED" }
  | { type: "SYNC_DONE"; completed: boolean }
  | { type: "SYNC_STOP" }
  | { type: "SYNCING_TEXT" }
  | { type: "DISCOVERY_ERROR"; message: string }
  | { type: "SYNC_ERROR" }
  | { type: "UNAUTHORIZED"; message: string }
  | { type: "CONNECT_START" }
  | { type: "CONNECT_FAIL" };

function widgetReducer(state: WidgetState, action: Action): WidgetState {
  switch (action.type) {
    case "SET_PANEL":
      return { ...state, panel: action.panel };

    case "SET_CLOSED":
      return { ...state, closed: action.closed };

    case "SET_MODAL":
      return { ...state, modal: action.modal };

    case "CONNECTED":
      return {
        ...state,
        active: true,
        online: true,
        panel: "connected",
        backend: action.backend,
        user: action.user,
        statusText: "Connected",
        syncEnabled: action.syncEnabled,
        closed: false,
        connecting: false,
        discoveryError: null,
      };

    case "DISCONNECTED": {
      const panel: WidgetPanel = state.skipInitial
        ? state.hasApiKeys
          ? "choose"
          : "sign-in"
        : "initial";
      return {
        ...state,
        active: false,
        backend: null,
        closed: false,
        panel,
      };
    }

    case "NETWORK_ONLINE":
      if (state.online) return state;
      return {
        ...state,
        online: true,
        statusText: state.active ? "Connected" : state.statusText,
      };

    case "NETWORK_OFFLINE":
      if (!state.online) return state;
      return { ...state, online: false, statusText: "Offline" };

    case "SYNC_STARTED":
      return { ...state, syncing: true };

    case "SYNCING_TEXT":
      // Only update if still syncing (guards against delayed dispatch)
      return state.syncing ? { ...state, statusText: "Synchronizing" } : state;

    case "SYNC_DONE":
      // Ignore partial (non-final) sync events while online
      if (!action.completed && state.online) return state;
      return {
        ...state,
        syncing: false,
        statusText: state.online ? "Synced" : "Offline",
      };

    case "SYNC_STOP":
      return { ...state, syncing: false };

    case "DISCOVERY_ERROR":
      return { ...state, discoveryError: action.message, connecting: false };

    case "SYNC_ERROR":
      if (!state.online) return state;
      return { ...state, online: false, statusText: "Offline" };

    case "UNAUTHORIZED":
      return {
        ...state,
        panel: "error",
        errorMessage: action.message,
        showReconnect: true,
        closed: false,
      };

    case "CONNECT_START":
      return { ...state, connecting: true, discoveryError: null };

    case "CONNECT_FAIL":
      return { ...state, connecting: false };

    default:
      return state;
  }
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export interface RootProps {
  rs: RemoteStorage;
  children: ReactNode;
  leaveOpen?: boolean;
  autoCloseAfter?: number;
  skipInitial?: boolean;
  logging?: boolean;
  modalBackdrop?: boolean | "onlySmallScreens";
}

function Root({
  rs,
  children,
  leaveOpen = false,
  autoCloseAfter = 1500,
  skipInitial = false,
  logging = false,
  modalBackdrop = "onlySmallScreens",
}: RootProps) {
  const log = useCallback(
    (...msg: unknown[]) => {
      if (logging) console.debug("[RS-WIDGET]", ...msg);
    },
    [logging],
  );

  // Compute initial state once — avoids a useEffect just to set initial values
  const [state, dispatch] = useReducer(
    widgetReducer,
    undefined,
    (): WidgetState => {
      const isModal =
        modalBackdrop === true ||
        (modalBackdrop === "onlySmallScreens" &&
          typeof window !== "undefined" &&
          window.innerWidth < 421);

      const hasApiKeys =
        !!(rs.apiKeys && Object.keys(rs.apiKeys).length > 0);
      const panel: WidgetPanel = skipInitial
        ? hasApiKeys
          ? "choose"
          : "sign-in"
        : "initial";

      return {
        panel,
        closed: false,
        online: false,
        active: false,
        backend: null,
        syncing: false,
        syncEnabled: true,
        user: "",
        statusText: "Connected",
        errorMessage: "",
        showReconnect: false,
        discoveryError: null,
        connecting: false,
        modal: isModal,
        skipInitial,
        hasApiKeys,
      };
    },
  );

  // Refs for values accessed inside stable event callbacks
  const leaveOpenRef = useRef(leaveOpen);
  const autoCloseAfterRef = useRef(autoCloseAfter);
  const skipInitialRef = useRef(skipInitial);
  const stateRef = useRef(state);
  const shouldAutoCloseAfterSyncRef = useRef(false);
  const syncLabelTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Keep refs in sync with current values (no re-renders)
  leaveOpenRef.current = leaveOpen;
  autoCloseAfterRef.current = autoCloseAfter;
  skipInitialRef.current = skipInitial;
  stateRef.current = state;

  // ── Action helpers ──────────────────────────────────────────────────────────

  const showChooseOrSignIn = useCallback(() => {
    const panel =
      rs.apiKeys && Object.keys(rs.apiKeys).length > 0 ? "choose" : "sign-in";
    dispatch({ type: "SET_PANEL", panel });
  }, [rs.apiKeys]);

  const close = useCallback(() => {
    const s = stateRef.current;
    if (s.panel === "error") return;

    if (!s.active) {
      if (skipInitialRef.current) {
        showChooseOrSignIn();
      } else {
        dispatch({ type: "SET_PANEL", panel: "initial" });
      }
    } else if (leaveOpenRef.current) {
      dispatch({ type: "SET_PANEL", panel: "connected" });
    } else {
      dispatch({ type: "SET_CLOSED", closed: true });
    }
  }, [showChooseOrSignIn]);

  // Stable ref to always call the latest close function (used in setTimeout callbacks)
  const closeRef = useRef(close);
  closeRef.current = close;

  const actions = useMemo(
    (): WidgetActions => ({
      open: () => dispatch({ type: "SET_CLOSED", closed: false }),
      close: () => closeRef.current(),
      toggle: () => {
        const s = stateRef.current;
        if (s.closed) {
          dispatch({ type: "SET_CLOSED", closed: false });
        } else if (s.panel === "initial") {
          showChooseOrSignIn();
        } else {
          closeRef.current();
        }
      },
      showSignIn: () => dispatch({ type: "SET_PANEL", panel: "sign-in" }),
      showChoose: () => dispatch({ type: "SET_PANEL", panel: "choose" }),
      showChooseOrSignIn,
      connect: (userAddress) => {
        dispatch({ type: "CONNECT_START" });
        rs.connect(userAddress);
      },
      disconnect: () => {
        dispatch({ type: "DISCONNECTED" });
        rs.disconnect();
      },
      reconnect: () => rs.reconnect(),
      startSync: () => rs.startSync(),
      stopSync: () => {
        dispatch({ type: "SYNC_STOP" });
        rs.stopSync();
      },
    }),
    [rs, showChooseOrSignIn],
  );

  // ── RS event subscriptions — the single useEffect for external sync ─────────
  useEffect(() => {
    log("Setting up RemoteStorage event handlers");

    const handleSyncStarted = () => {
      clearTimeout(syncLabelTimerRef.current);
      dispatch({ type: "SYNC_STARTED" });
      // Show "Synchronizing" text only after a 1-second delay (avoids flicker on fast syncs)
      syncLabelTimerRef.current = setTimeout(() => {
        dispatch({ type: "SYNCING_TEXT" });
      }, 1000);
    };

    const handleSyncDone = (msg?: unknown) => {
      clearTimeout(syncLabelTimerRef.current);
      const completed = (msg as { completed?: boolean })?.completed ?? false;
      dispatch({ type: "SYNC_DONE", completed });
      if (shouldAutoCloseAfterSyncRef.current && !stateRef.current.closed) {
        setTimeout(() => closeRef.current(), autoCloseAfterRef.current);
      }
    };

    rs.on("connected", () => {
      const syncEnabled = rs.hasFeature("Sync");
      dispatch({
        type: "CONNECTED",
        user: rs.remote.userAddress,
        backend: rs.backend,
        syncEnabled,
      });
      if (syncEnabled) {
        shouldAutoCloseAfterSyncRef.current = true;
        rs.on("sync-req-done", handleSyncStarted);
        rs.on("sync-done", handleSyncDone);
      } else {
        setTimeout(() => closeRef.current(), autoCloseAfterRef.current);
      }
    });

    rs.on("ready", () => log("RS ready"));

    rs.on("disconnected", () => {
      shouldAutoCloseAfterSyncRef.current = false;
      dispatch({ type: "DISCONNECTED" });
    });

    rs.on("network-online", () => dispatch({ type: "NETWORK_ONLINE" }));
    rs.on("network-offline", () => dispatch({ type: "NETWORK_OFFLINE" }));

    rs.on("error", (error: unknown) => {
      const err = error as {
        name?: string;
        message?: string;
        code?: string;
      };
      log("RS error:", err?.name);
      if (err?.name === "DiscoveryError") {
        dispatch({
          type: "DISCOVERY_ERROR",
          message: err.message ?? "Storage discovery failed",
        });
      } else if (err?.name === "SyncError") {
        dispatch({ type: "SYNC_ERROR" });
      } else if (err?.name === "Unauthorized") {
        if (err.code === "access_denied") {
          rs.disconnect();
        } else {
          dispatch({
            type: "UNAUTHORIZED",
            message: err.message ?? "Unauthorized",
          });
        }
      } else {
        console.debug("[RS-WIDGET] Unhandled error:", error);
      }
    });

    // Close widget when clicking outside
    const handleDocumentClick = () => closeRef.current();
    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      clearTimeout(syncLabelTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally runs once

  const contextValue = useMemo(
    () => ({ state, actions, rs }),
    [state, actions, rs],
  );

  return (
    <RSWidgetContext.Provider value={contextValue}>
      {children}
    </RSWidgetContext.Provider>
  );
}

// ─── Primitive components ──────────────────────────────────────────────────────

/** Clickable widget icon. Toggles open/close on click. */
function Icon({
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  const { actions } = useRSWidget();
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") actions.toggle();
      }}
      {...props}
      onClick={(e) => {
        actions.toggle();
        props.onClick?.(e);
      }}
    >
      {children}
    </div>
  );
}

/** Renders only when `panel === 'initial'`. Clicks advance to choose/sign-in. */
function InitialView({
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  const { state, actions } = useRSWidget();
  if (state.panel !== "initial") return null;
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") actions.showChooseOrSignIn();
      }}
      {...props}
      onClick={(e) => {
        actions.showChooseOrSignIn();
        props.onClick?.(e);
      }}
    >
      {children}
    </div>
  );
}

/** Renders only when `panel === 'connected'`. */
function ConnectedView({
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  const { state } = useRSWidget();
  if (state.panel !== "connected") return null;
  return <div {...props}>{children}</div>;
}

/** Renders only when `panel === 'sign-in'`. */
function SignInView({
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  const { state } = useRSWidget();
  if (state.panel !== "sign-in") return null;
  return <div {...props}>{children}</div>;
}

/** Renders only when `panel === 'choose'`. */
function ChooseView({
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  const { state } = useRSWidget();
  if (state.panel !== "choose") return null;
  return <div {...props}>{children}</div>;
}

/** Renders only when `panel === 'error'`. */
function ErrorView({
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  const { state } = useRSWidget();
  if (state.panel !== "error") return null;
  return <div {...props}>{children}</div>;
}

/** Sign-in form with address input + submit button. Auto-focuses input on mount. */
export interface ConnectFormProps extends FormHTMLAttributes<HTMLFormElement> {
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  labelProps?: React.LabelHTMLAttributes<HTMLLabelElement>;
  buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  /** Content for the submit button (defaults to "Connect" / "Connecting…") */
  buttonContent?: ReactNode;
  /** When true, omit the submit button; caller renders it with form={formId} for shared-element transitions */
  externalButton?: boolean;
  /** Required when externalButton; use as id on form and form attribute on external button */
  formId?: string;
}

function ConnectForm({
  inputProps,
  labelProps,
  buttonProps,
  buttonContent,
  children,
  externalButton,
  formId,
  ...formProps
}: ConnectFormProps) {
  const { state, actions } = useRSWidget();
  const inputRef = useRef<HTMLInputElement>(null);
  const effectiveFormId = formId ?? "rs-connect-form";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    (formProps.onSubmit as React.FormEventHandler<HTMLFormElement> | undefined)?.(e);
    const address = inputRef.current?.value.trim();
    if (address) actions.connect(address);
  };

  return (
    <form id={effectiveFormId} {...formProps} onSubmit={handleSubmit}>
      <label htmlFor="rs-user-address" {...labelProps}>
        {labelProps?.children ?? "Storage address"}
      </label>
      <input
        ref={inputRef}
        id="rs-user-address"
        type="text"
        name="rs-user-address"
        placeholder="user@provider.com"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="email"
        disabled={state.connecting}
        {...inputProps}
      />
      {state.discoveryError && (
        <p role="alert" aria-live="polite">
          {state.discoveryError}
        </p>
      )}
      {!externalButton && (
        <button type="submit" disabled={state.connecting} {...buttonProps}>
          {buttonContent ?? (state.connecting ? "Connecting…" : "Connect")}
        </button>
      )}
      {children}
    </form>
  );
}

/** Disconnect button — calls `rs.disconnect()` on click. */
function DisconnectButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  const { actions } = useRSWidget();
  return (
    <button type="button" {...props} onClick={(e) => { actions.disconnect(); props.onClick?.(e); }}>
      {children}
    </button>
  );
}

/** Sync button — starts/stops sync, reflects syncing state via `data-syncing`. */
function SyncButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  const { state, actions } = useRSWidget();
  return (
    <button
      type="button"
      data-syncing={state.syncing || undefined}
      {...props}
      onClick={(e) => {
        state.syncing ? actions.stopSync() : actions.startSync();
        props.onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}

/** Reconnect/renew button — calls `rs.reconnect()`. Only renders when `showReconnect` is true. */
function ReconnectButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  const { state, actions } = useRSWidget();
  if (!state.showReconnect) return null;
  return (
    <button type="button" {...props} onClick={(e) => { actions.reconnect(); props.onClick?.(e); }}>
      {children ?? "Renew"}
    </button>
  );
}

// ─── Namespace export ─────────────────────────────────────────────────────────

export const RemoteStorageWidget = {
  Root,
  Icon,
  InitialView,
  ConnectedView,
  SignInView,
  ChooseView,
  ErrorView,
  ConnectForm,
  DisconnectButton,
  SyncButton,
  ReconnectButton,
};

export default RemoteStorageWidget;
