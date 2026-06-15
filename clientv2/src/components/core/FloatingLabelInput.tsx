/**
 * Floating Label Input Component
 * Animated label that floats above the input when focused or has value
 */

import { useState, useId } from 'react';
import { useTypewriterSound } from '../../hooks';

interface FloatingLabelInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
  error?: string;
  enableTypewriterSound?: boolean;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  maxLength,
  className = '',
  error,
  enableTypewriterSound = true
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = useId();
  const handleTypewriterSound = useTypewriterSound();

  const hasValue = value.length > 0;
  const isFloating = isFocused || hasValue;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (enableTypewriterSound) {
      handleTypewriterSound(e);
    }
  };

  return (
    <div className={`floating-label-container ${className}`}>
      <div className={`floating-label-wrapper ${isFloating ? 'floating' : ''} ${isFocused ? 'focused' : ''} ${error ? 'error' : ''}`}>
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isFloating ? placeholder : ''}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          className="floating-label-input"
        />
        <label
          htmlFor={inputId}
          className={`floating-label ${isFloating ? 'floating' : ''}`}
        >
          {label}{required && <span className="required-asterisk">*</span>}
        </label>
      </div>
      {error && <span className="floating-label-error">{error}</span>}
    </div>
  );
};

export default FloatingLabelInput;
