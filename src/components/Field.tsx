import { cloneElement, isValidElement, useId, type ReactElement } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  full?: boolean;
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
}

/** Label + control + hint/error, wired with the right ARIA attributes. */
export function Field({ label, error, hint, full, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || hint ? messageId : undefined,
      })
    : children;

  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {control}
      {error ? (
        <span className="error" id={messageId} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="hint" id={messageId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
