export function Feedback({ success, error }: { success?: string | null; error?: string | null }) {
  return (
    <>
      {success && (
        <div role="status" className="alert-banner alert-success" data-testid="success-message">
          {success}
        </div>
      )}
      {error && (
        <div role="alert" className="alert-banner alert-error" data-testid="feedback-error">
          {error}
        </div>
      )}
    </>
  );
}