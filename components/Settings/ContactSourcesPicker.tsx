"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Spinner } from "../ui/spinner";
import { ResponsiveDialog } from "../ui/responsive-dialog";
import { useContactSources } from "../../utils/useContactSources";
import type { ContactSourceSelection } from "../../lib/solidRdf/addressBooks";

function toggle(list: string[], id: string, on: boolean): string[] {
  return on ? Array.from(new Set([...list, id])) : list.filter((x) => x !== id);
}

/**
 * Compact "Contact suggestions" row for Settings › Entity Management. The
 * row shows what's chosen; the dialog holds the address-book / group tree.
 */
export function ContactSourcesPicker() {
  const { books, selection, loading, saving, error, save, refresh } = useContactSources();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ContactSourceSelection>(selection);

  // Start every edit from what's saved, not from an abandoned draft.
  const openPicker = () => {
    setDraft(selection);
    setOpen(true);
  };

  const nothingChosen = selection.books.length === 0 && selection.groups.length === 0;

  let summary: string;
  if (loading) summary = "Looking for address books in your pod…";
  else if (books.length === 0) summary = "No address books found in your pod";
  else if (nothingChosen) summary = `All address books (${books.length})`;
  else {
    const parts: string[] = [];
    if (selection.books.length) parts.push(`${selection.books.length} address book${selection.books.length === 1 ? "" : "s"}`);
    if (selection.groups.length) parts.push(`${selection.groups.length} group${selection.groups.length === 1 ? "" : "s"}`);
    summary = parts.join(" · ");
  }

  const handleSave = async () => {
    try {
      await save(draft);
      setOpen(false);
    } catch {
      // Error is surfaced inline by the hook; keep the dialog open.
    }
  };

  return (
    <>
      <div className="border border-border rounded-control p-3 bg-muted/30 flex items-start justify-between gap-3">
        <div className="flex flex-col min-w-0 gap-0.5">
          <span className="text-sm font-medium text-foreground">@mention suggestions</span>
          <span className="text-xs text-muted-foreground">{summary}</span>
          {error && !open && (
            <span role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openPicker}
          disabled={loading}
          className="shrink-0"
        >
          Choose
        </Button>
      </div>

      <ResponsiveDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Suggest contacts from"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        {loading ? (
          <Spinner className="h-5 w-5 text-muted-foreground" />
        ) : books.length === 0 ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              No <code>vcard:AddressBook</code> is registered in your pod&apos;s type index, and there is nothing under{" "}
              <code>/contacts/</code>. Create an address book in SolidOS (or another contacts app) and it will show up here.
            </p>
            <button type="button" onClick={refresh} className="text-foreground underline underline-offset-2">
              Look again
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pick whole address books, or only some of their groups. Leave everything unchecked to use every address book.
            </p>
            <ul className="space-y-3">
              {books.map((book) => {
                const bookOn = draft.books.includes(book.url);
                const bookId = `cs-book-${encodeURIComponent(book.url)}`;
                return (
                  <li key={book.url} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={bookId}
                        compact
                        boxSize="lg"
                        checked={bookOn}
                        onCheckedChange={(on) => setDraft((d) => ({ ...d, books: toggle(d.books, book.url, on) }))}
                      />
                      <label htmlFor={bookId} className="text-sm font-medium text-foreground cursor-pointer truncate" title={book.url}>
                        {book.title}
                      </label>
                    </div>
                    {book.groups.length > 0 && (
                      <ul className="ml-7 space-y-1">
                        {book.groups.map((group) => {
                          const groupId = `cs-group-${encodeURIComponent(group.url)}`;
                          const groupOn = bookOn || draft.groups.includes(group.url);
                          return (
                            <li key={group.url} className="flex items-center gap-2">
                              <Checkbox
                                id={groupId}
                                compact
                                checked={groupOn}
                                disabled={bookOn}
                                onCheckedChange={(on) => setDraft((d) => ({ ...d, groups: toggle(d.groups, group.url, on) }))}
                              />
                              <label
                                htmlFor={groupId}
                                className={`text-sm cursor-pointer truncate ${bookOn ? "text-muted-foreground" : "text-foreground"}`}
                                title={group.url}
                              >
                                {group.name}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
            {error && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
        )}
      </ResponsiveDialog>
    </>
  );
}
