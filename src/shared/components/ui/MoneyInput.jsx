import React, { useState, useEffect } from 'react';

/**
 * Input de monto que muestra separadores de miles con comas mientras el
 * usuario escribe, pero expone el valor numérico puro a través de onChange.
 *
 * Props:
 *  - value: número (o string numérico)
 *  - onChange: function(numericString) — recibe el valor sin formato
 *  - className, placeholder, min, step, disabled, readOnly: iguales a <input>
 */
export function MoneyInput({ value, onChange, className = '', placeholder = '0', min, step, disabled, readOnly, ...rest }) {
  const formatDisplay = (raw) => {
    const str = String(raw ?? '').replace(/[^0-9.]/g, '');
    const [intPart, decPart] = str.split('.');
    const formatted = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
    return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
  };

  const [displayValue, setDisplayValue] = useState(() => formatDisplay(value));

  useEffect(() => {
    // Sync when value changes externally (e.g. preset selected)
    const numeric = String(value ?? '').replace(/[^0-9.]/g, '');
    const currentNumeric = String(displayValue).replace(/[^0-9.]/g, '');
    if (numeric !== currentNumeric) {
      setDisplayValue(formatDisplay(value));
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    // Prevent multiple dots
    const sanitized = raw.split('.').length > 2 ? raw.replace(/\.(?=.*\.)/, '') : raw;
    setDisplayValue(formatDisplay(sanitized));
    onChange?.(sanitized);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}

export default MoneyInput;
