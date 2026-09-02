import { useState, useCallback } from 'react';
import {
  DEFAULT_DAYS_BACK,
  DEFAULT_MIN_DURATION_SECONDS,
  ProcessingOptions,
} from '../../utils/activityWatch';
import { UploadIcon } from '@heroicons/react/outline';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface ImportActivityWatchFormProps {
  onImport: (file: File, options: ProcessingOptions) => Promise<void>;
  onCancel: () => void;
}

export default function ImportActivityWatchForm({
  onImport,
  onCancel,
}: ImportActivityWatchFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [daysBack, setDaysBack] = useState(DEFAULT_DAYS_BACK);
  const [minDuration, setMinDuration] = useState(DEFAULT_MIN_DURATION_SECONDS);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }
      setSelectedFile(file);
      setError(null);
    },
    []
  );

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await onImport(selectedFile, {
        daysBack,
        minDurationSeconds: minDuration,
        clearExisting,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, onImport, daysBack, minDuration, clearExisting]);

  return (
    <div className="space-y-4 mt-4">
      {/* File Input */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Select ActivityWatch export file (JSON)
        </label>
        <div className="relative">
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            disabled={isProcessing}
            className="flex h-10 w-full rounded-chip border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>
        {selectedFile && (
          <p className="text-xs text-muted-foreground mt-1">
            Selected: {selectedFile.name}
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-control">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground">Import Options</h4>

        {/* Days Back */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Days to import
          </label>
          <Input
            type="number"
            min="1"
            max="90"
            value={daysBack}
            onChange={(e) => setDaysBack(parseInt(e.target.value))}
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Import events from the last N days (recommended: 7)
          </p>
        </div>

        {/* Min Duration */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Minimum duration (seconds)
          </label>
          <Input
            type="number"
            min="0"
            max="300"
            value={minDuration}
            onChange={(e) => setMinDuration(parseInt(e.target.value))}
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Filter out events shorter than this (recommended: 60)
          </p>
        </div>

        {/* Clear Existing */}
        <div className="flex items-start">
          <input
            type="checkbox"
            id="clearExisting"
            checked={clearExisting}
            onChange={(e) => setClearExisting(e.target.checked)}
            disabled={isProcessing}
            className="mt-1 h-4 w-4 text-primary border-border rounded focus:ring-primary disabled:opacity-50"
          />
          <label htmlFor="clearExisting" className="ml-2 text-sm text-foreground">
            Clear existing ActivityWatch data before importing
            <p className="text-xs text-muted-foreground mt-0.5">
              If unchecked, new data will be merged with existing data
            </p>
          </label>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={!selectedFile || isProcessing}
        >
          {isProcessing ? (
            <>Processing...</>
          ) : (
            <>
              <UploadIcon />
              Import
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
