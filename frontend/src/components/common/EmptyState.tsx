interface EmptyStateProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title = "No data to display",
  message,
  action,
}: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className="state-container state-empty"
      data-testid="empty-state"
    >
      <div className="state-icon" aria-hidden="true">
        📋
      </div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="btn btn-secondary state-action-btn"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
