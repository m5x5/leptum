import Modal from './index';
import { ProcessedAWEvent } from '../../activity-watch.d';
import { ClockIcon, DocumentTextIcon } from '@heroicons/react/solid';

interface AWEventDetailModalProps {
  isOpen: boolean;
  closeModal: () => void;
  event: ProcessedAWEvent | null;
  onCreateManualEntry?: (event: ProcessedAWEvent) => void;
}

export default function AWEventDetailModal({
  isOpen,
  closeModal,
  event,
  onCreateManualEntry,
}: AWEventDetailModalProps) {
  if (!event) {
    return null;
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>ActivityWatch Event Details</Modal.Title>
      <Modal.Body>
        <div className="space-y-4 mt-4">
          {/* Header Info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className={`w-3 h-12 rounded-sm ${event.color}`} />
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">{event.displayName}</h4>
              <p className="text-sm text-muted-foreground">{event.bucketType}</p>
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <ClockIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Timestamp</p>
                <p className="text-sm text-muted-foreground">
                  {formatTimestamp(event.timestamp)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <ClockIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Duration</p>
                <p className="text-sm text-muted-foreground">
                  {formatDuration(event.duration)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <DocumentTextIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Bucket ID</p>
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {event.bucketId}
                </p>
              </div>
            </div>
          </div>

          {/* Event Data */}
          <div className="border-t border-border pt-4">
            <h5 className="text-sm font-semibold text-foreground mb-2">Event Data</h5>
            <div className="bg-background p-3 rounded-lg border border-border max-h-64 overflow-y-auto">
              <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-words">
                {JSON.stringify(event.eventData, null, 2)}
              </pre>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              <span className="font-semibold">Note:</span> ActivityWatch events are read-only to preserve data integrity. If you want to edit this activity, create a manual entry instead.
            </p>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-2 justify-between">
          {onCreateManualEntry && (
            <button
              onClick={() => {
                onCreateManualEntry(event);
                closeModal();
              }}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 font-semibold"
            >
              Create Manual Entry
            </button>
          )}
          <button
            onClick={closeModal}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80 ml-auto"
          >
            Close
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
