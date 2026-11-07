export function StatusBadge({ status, testId }: { status: string; testId?: string }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`} data-testid={testId}>
      {status}
    </span>
  );
}