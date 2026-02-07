import { useState, useCallback } from 'react';
import Modal from './index';
import { Welcome } from '../../activity-watch.d';
import {
  parseActivityWatchJSON,
  getImportPreview,
  ImportPreview,
  ProcessingOptions,
  DEFAULT_DAYS_BACK,
  DEFAULT_MIN_DURATION_SECONDS,
} from '../../utils/activityWatch';
import { UploadIcon, XIcon } from '@heroicons/react/outline';
import { Input } from '../ui/input';

interface ImportActivityWatchModalProps {
  isOpen: boolean;
  closeModal: () => void;
  onImport: (file: File, options: ProcessingOptions) => Promise<void>;
}

export default function ImportActivityWatchModal({
  isOpen,
  closeModal,
  onImport,
}: ImportActivityWatchModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [daysBack, setDaysBack] = useState(DEFAULT_DAYS_BACK);
  const [minDuration, setMinDuration] = useState(DEFAULT_MIN_DURATION_SECONDS);

  /**
   * Handle file selection
   */
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      setSelectedFile(file);
      setError(null);
      setIsProcessing(true);

      try {
        // Parse and preview
        const welcomeData: Welcome = await parseActivityWatchJSON(file);
        const previewData = getImportPreview(welcomeData, { daysBack, minDurationSeconds: minDuration });
        setPreview(previewData);
      } catch (err: any) {
        setError(err.message || 'Failed to parse file');
        setPreview(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [daysBack, minDuration]
  );

  /**
   * Handle close and reset state
   */
  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    setClearExisting(false);
    setDaysBack(DEFAULT_DAYS_BACK);
    setMinDuration(DEFAULT_MIN_DURATION_SECONDS);
    closeModal();
  }, [closeModal]);

  /**
   * Handle import
   */
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

      // Close modal on success
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import data');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, onImport, daysBack, minDuration, clearExisting, handleClose]);

  /**
   * Update preview when options change
   */
  const updatePreview = useCallback(
    async (newDaysBack: number, newMinDuration: number) => {
      if (!selectedFile) return;

      setIsProcessing(true);
      try {
        const welcomeData: Welcome = await parseActivityWatchJSON(selectedFile);
        const previewData = getImportPreview(welcomeData, {
          daysBack: newDaysBack,
          minDurationSeconds: newMinDuration,
        });
        setPreview(previewData);
      } catch (err: any) {
        setError(err.message || 'Failed to update preview');
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedFile]
  );

  return (
    <Modal isOpen={isOpen} closeModal={handleClose}>
      <Modal.Title>Import ActivityWatch Data</Modal.Title>
      <Modal.Body>
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
                className="block w-full text-sm text-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:opacity-90
                  file:cursor-pointer cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold text-foreground">Preview</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">Buckets:</span> {preview.bucketCount}
                </p>
                <p>
                  <span className="font-medium">Bucket types:</span>{' '}
                  {preview.bucketTypes.join(', ')}
                </p>
                <p>
                  <span className="font-medium">Total events:</span> {preview.totalEventCount.toLocaleString()}
                </p>
                <p>
                  <span className="font-medium">After filtering:</span>{' '}
                  {preview.filteredEventCount.toLocaleString()} events
                </p>
                <p>
                  <span className="font-medium">Date range:</span> {preview.dateRange}
                </p>
              </div>
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
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setDaysBack(value);
                  updatePreview(value, minDuration);
                }}
                disabled={isProcessing || !selectedFile}
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
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setMinDuration(value);
                  updatePreview(daysBack, value);
                }}
                disabled={isProcessing || !selectedFile}
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
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="min-h-[44px] px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile || isProcessing || !preview}
            className="min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <UploadIcon className="w-4 h-4" />
                Import
              </>
            )}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
