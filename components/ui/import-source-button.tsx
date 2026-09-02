"use client";

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

interface ImportSourceButtonProps {
  onActivityWatch: () => void;
  onGoogleCalendar: () => void;
  /** Visual size: 'sm' for per-day headers, 'md' for toolbar (default) */
  size?: 'sm' | 'md';
}

export function ImportSourceButton({
  onActivityWatch,
  onGoogleCalendar,
  size = 'md',
}: ImportSourceButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={size === 'sm' ? 'outline' : 'secondary'}
          size="sm"
          className={size === 'sm' ? 'gap-1.5' : 'hidden md:inline-flex md:px-4'}
        >
          <UploadIcon />
          Import
          <svg className="!size-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onSelect={onActivityWatch} className="gap-3 py-2.5">
          <AWIcon />
          <div>
            <div className="font-medium text-foreground">ActivityWatch</div>
            <div className="text-xs text-muted-foreground">Import from JSON file</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onGoogleCalendar} className="gap-3 py-2.5">
          <GCalIcon />
          <div>
            <div className="font-medium text-foreground">Google Calendar</div>
            <div className="text-xs text-muted-foreground">Sign in &amp; pick a calendar</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function AWIcon() {
  return (
    <div className="w-7 h-7 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-semibold">
      AW
    </div>
  );
}

function GCalIcon() {
  return (
    <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
