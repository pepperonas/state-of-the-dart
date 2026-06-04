import React, { useId } from 'react';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Leading icon node (positioned inside the field). */
  icon?: React.ReactNode;
  /** Error message — also switches the field to the error colour role. */
  error?: string;
}

/**
 * Material 3 Expressive outlined text field. Token-backed colours, 56px height,
 * optional leading icon and error state.
 */
const TextField: React.FC<TextFieldProps> = ({
  label,
  icon,
  error,
  className = '',
  id,
  ...rest
}) => {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={['m3-field', error ? 'm3-error' : '', className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={inputId} className="m3-field-label">
          {label}
        </label>
      )}
      <div className="m3-field-input-wrap">
        {icon && <span className="m3-field-icon">{icon}</span>}
        <input
          id={inputId}
          className={['m3-text-field', icon ? 'm3-has-icon' : ''].filter(Boolean).join(' ')}
          aria-invalid={!!error}
          {...rest}
        />
      </div>
      {error && (
        <span className="m3-body-small" style={{ color: 'var(--m3-error)' }}>
          {error}
        </span>
      )}
    </div>
  );
};

export default TextField;
