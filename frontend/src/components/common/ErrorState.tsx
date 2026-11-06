interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "An error occurred",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="state-container state-error"
      data-testid="error-state"
    >
      <div className="state-icon" aria-hidden="true">
        ⚠️
      </div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-secondary state-action-btn"
        >
          Retry
        </button>
      )}
    </div>
  );
}
