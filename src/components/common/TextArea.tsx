import React, { useId } from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

/**
 * Multi-line counterpart of TextField: same outlined M3 field, same tokens.
 * The app's textareas were each styled by hand, most of them dark-only.
 */
const TextArea: React.FC<TextAreaProps> = ({ label, error, className = '', id, rows = 4, ...rest }) => {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={['m3-field', error ? 'm3-error' : '', className].filter(Boolean).join(' ')}>
      {label && <label htmlFor={fieldId} className="m3-field-label">{label}</label>}
      <textarea
        id={fieldId}
        rows={rows}
        className="m3-text-field m3-text-area"
        aria-invalid={!!error}
        {...rest}
      />
      {error && <span className="m3-body-small" style={{ color: 'var(--m3-error)' }}>{error}</span>}
    </div>
  );
};

export default TextArea;
