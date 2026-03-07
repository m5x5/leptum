/**
 * LoginButtons — inline provider selection + sign-in flow.
 *
 * Skips the "Connect your storage" hint and shows provider buttons immediately.
 * Use this when you want to embed the login flow directly in a page/sidebar
 * rather than as a floating collapsible widget.
 *
 * @example
 * ```tsx
 * import { LoginButtons } from '../lib/remotestorage-widget';
 * <LoginButtons rs={remoteStorage} />
 * ```
 */
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ReactNode } from "react";
import { useRSWidget, RemoteStorageWidget as RSW } from "./RemoteStorageWidget";
import type { RootProps, WidgetState } from "./RemoteStorageWidget";

// ─── Icons ────────────────────────────────────────────────────────────────────

function RemoteStorageLogo({ className = "" }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 739 853" aria-hidden="true">
      <path d="M370 754 0 542v98l185 107 185 106 184-106 185-107V378l-86 49-283 162L86 427v-66l99 57 185 106 184-106 99-57 86-50v-98L554 107 370 0 185 107 58 180l86 50 84-49 142-81 141 81 141 82-282 162L87 263 0 213v263l86 49 99 57 185 107 184-107 99-57v67z" fill="#FF4B03" />
    </svg>
  );
}

function DropboxLogo({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M8 2.4l8 5.1-8 5.1-8-5.1 8-5.1zm16 0l8 5.1-8 5.1-8-5.1 8-5.1zM0 17.7l8-5.1 8 5.1-8 5.1-8-5.1zm24-5.1l8 5.1-8 5.1-8-5.1 8-5.1zM8 24.5l8-5.1 8 5.1-8 5.1-8-5.1z" fill="#0061FE" />
    </svg>
  );
}

function GoogleDriveLogo({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" aria-hidden="true">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00AC47" />
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 11.5z" fill="#EA4335" />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684FC" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00" />
    </svg>
  );
}

function SyncIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5-4v4h4" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
    </svg>
  );
}

function PowerIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 6a7.75 7.75 0 1 0 10 0" />
      <path d="M12 4v8" />
    </svg>
  );
}

function WarningIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function SpinnerIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" aria-hidden="true">
      <g fill="none"><g strokeWidth="2">
        <circle strokeOpacity=".35" cx="19" cy="19" r="18" />
        <path d="M37 19C37 9.06 28.94 1 19 1" />
      </g></g>
    </svg>
  );
}

function InfoIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

// ─── Inner content (uses context from Root) ───────────────────────────────────

const PROVIDER_BTN_CLASS =
  "flex items-center gap-2.5 px-3 py-2 w-full text-left font-[inherit] text-inherit bg-white dark:bg-transparent border border-gray-200 dark:border-gray-800 rounded-md shadow-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] appearance-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:focus-visible:outline-white";

const PROVIDER_BTN_BASE =
  "flex items-center gap-2.5 px-3 py-2 w-full text-left font-[inherit] text-inherit bg-white dark:bg-transparent border border-gray-200 dark:border-gray-800 rounded-md shadow-xs transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] appearance-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:focus-visible:outline-white";

const VT_FORM = "login-form";
const VT_RS_BUTTON = "rs-button";
const VT_PROVIDERS = "login-providers";

const formId = "rs-login-form";

function LoginButtonsContent() {
  const { state, actions, rs } = useRSWidget();
  const isFirstLevel =
    state.panel === "choose" || state.panel === "sign-in";
  const targetView = isFirstLevel ? "first-level" : "connected";
  const [displayView, setDisplayView] = useState<"first-level" | "connected">(
    () => (isFirstLevel ? "first-level" : "connected")
  );
  const prevTargetRef = useRef(targetView);

  useEffect(() => {
    if (targetView === prevTargetRef.current) return;
    const prevTarget = prevTargetRef.current;
    prevTargetRef.current = targetView;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const useViewTransition =
      !prefersReducedMotion &&
      typeof document !== "undefined" &&
      "startViewTransition" in document;

    if (useViewTransition) {
      (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(
        () => flushSync(() => setDisplayView(targetView))
      );
    } else {
      setDisplayView(targetView);
    }
  }, [targetView]);

  const hasProviders = !!(rs.dropbox || rs.googledrive);
  const showFirstLevel = displayView === "first-level";

  return (
    <div
      className="font-sans text-[16px]"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >

      {/* ── View Transitions: form/providers exit; RS button morphs in place ─ */}
      <div className="flex flex-col gap-1.5">
        {showFirstLevel ? (
          <>
            <div
              className="flex flex-col gap-0"
              style={{ viewTransitionName: VT_FORM } as React.CSSProperties}
            >
              <RSW.ConnectForm
                formId={formId}
                externalButton
                className="flex flex-col gap-0"
                labelProps={{
                  className: "mb-1.5 text-sm font-normal text-gray-600 dark:text-gray-400 flex items-center gap-1.5",
                  children: (
                    <>
                      Storage address
                      <a
                        href="https://remotestorage.io/get/"
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Need help?"
                        aria-label="Need help?"
                      >
                        <InfoIcon />
                      </a>
                    </>
                  ),
                }}
                inputProps={{
                  className:
                    "px-3 py-2.5 w-full font-[inherit] h-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-900 text-inherit outline-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-solid focus:outline-gray-900 dark:focus:outline-white box-border",
                }}
                buttonProps={{
                  className: `mt-3 mb-0 flex items-center justify-start gap-2.5 w-full text-left ${PROVIDER_BTN_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`,
                }}
                buttonContent={
                  <span className="flex items-center gap-2.5">
                    <RemoteStorageLogo className="size-7 shrink-0" />
                    Connect with RemoteStorage
                    {state.connecting && <SpinnerIcon className="size-4 animate-spin shrink-0" />}
                  </span>
                }
              >
                {state.discoveryError && (
                  <p role="alert" className="mt-2 mb-1 px-2 py-1.5 text-sm text-center bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded">
                    {state.discoveryError}
                  </p>
                )}
              </RSW.ConnectForm>
            </div>
            <div
              style={{ viewTransitionName: VT_RS_BUTTON } as React.CSSProperties}
            >
              <button
                form={formId}
                type="submit"
                disabled={state.connecting}
                className={`flex items-center justify-start gap-2.5 w-full text-left mt-3 ${PROVIDER_BTN_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="flex items-center gap-2.5">
                  <RemoteStorageLogo className="size-7 shrink-0" />
                  Connect with RemoteStorage
                  {state.connecting && <SpinnerIcon className="size-4 animate-spin shrink-0" />}
                </span>
              </button>
            </div>
            {hasProviders && (
              <div
                className="flex flex-col gap-2"
                style={{ viewTransitionName: VT_PROVIDERS } as React.CSSProperties}
              >
                <div className="flex items-center gap-3 my-0.5">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">or sign in with</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                </div>
                {rs.dropbox && (
                  <ProviderBtn
                    logo={<DropboxLogo className="size-7 shrink-0" />}
                    label="Dropbox"
                    onClick={() => rs.dropbox?.connect()}
                  />
                )}
                {rs.googledrive && (
                  <ProviderBtn
                    logo={<GoogleDriveLogo className="size-7 shrink-0" />}
                    label="Google Drive"
                    onClick={() => rs.googledrive?.connect()}
                  />
                )}
              </div>
            )}
          </>
        ) : (
          <div
            style={{ viewTransitionName: VT_RS_BUTTON } as React.CSSProperties}
          >
            <RemoteStorageOrConnected state={state} />
          </div>
        )}
      </div>

      {/* ── Error state ─────────────────────────────────────────────── */}
      <RSW.ErrorView className="flex flex-col gap-2.5">
        <div className="flex items-start gap-2">
          <WarningIcon className="size-4 text-red-500 dark:text-red-400 shrink-0 mt-px" />
          <p className="m-0 text-sm text-red-700 dark:text-red-400 leading-snug break-all">
            {state.errorMessage}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => actions.showChooseOrSignIn()}
            className="text-sm px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent shadow-xs font-[inherit] cursor-pointer text-inherit hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:focus-visible:outline-white"
          >
            Try again
          </button>
          <RSW.ReconnectButton className="text-sm px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent shadow-xs font-[inherit] cursor-pointer text-inherit hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:focus-visible:outline-white" />
          <RSW.DisconnectButton
            title="Disconnect"
            className="ml-auto p-1.5 flex items-center rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent shadow-xs cursor-pointer text-inherit hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-red-500 hover:border-red-300 dark:hover:border-red-800 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:focus-visible:outline-white"
          >
            <PowerIcon />
          </RSW.DisconnectButton>
        </div>
      </RSW.ErrorView>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

/** Connected state: address + sync + disconnect. */
function RemoteStorageOrConnected({ state }: { state: WidgetState }) {
  const iconCls =
    "flex items-center justify-center shrink-0 w-8 h-8 rounded cursor-pointer bg-transparent text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:focus-visible:outline-white";
  return (
    <div className={PROVIDER_BTN_BASE}>
      <RemoteStorageLogo className="size-7 shrink-0" />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="font-medium text-[1em] truncate min-w-0 flex-1">{state.user}</span>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 shrink-0" aria-hidden />
        {state.syncEnabled && (
          <RSW.SyncButton
            title={state.statusText}
            className={`${iconCls} transition-[color] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-[#FF4B03] ${state.syncing ? "text-[#FF4B03]" : ""}`}
          >
            <SyncIcon className={`size-5 ${state.syncing ? "animate-spin" : ""}`} />
          </RSW.SyncButton>
        )}
        <RSW.DisconnectButton
          title="Disconnect"
          className={`${iconCls} hover:text-red-500 transition-[color] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]`}
        >
          <PowerIcon className="size-5" />
        </RSW.DisconnectButton>
      </div>
    </div>
  );
}

function ProviderBtn({
  logo,
  label,
  onClick,
}: {
  logo: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2.5 px-3 py-2 w-full text-left font-[inherit] text-inherit bg-white dark:bg-transparent border border-gray-200 dark:border-gray-800 rounded-md shadow-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] appearance-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:focus-visible:outline-white"
      >
      {logo}
      <span className="text-base font-medium">{label}</span>
    </button>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export type LoginButtonsProps = Omit<RootProps, "children">;

export function LoginButtons(props: LoginButtonsProps) {
  return (
    <RSW.Root {...props} skipInitial>
      <LoginButtonsContent />
    </RSW.Root>
  );
}

export default LoginButtons;
