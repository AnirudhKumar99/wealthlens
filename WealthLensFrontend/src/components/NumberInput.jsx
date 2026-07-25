import React, { useState, useEffect } from 'react';

export default function NumberInput({ name, defaultValue, value, onChange, required, currency = 'INR', className = 'form-input' }) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    const val = value !== undefined ? value : defaultValue;
    if (val !== undefined && val !== null && val !== '') {
      setDisplayValue(formatNumber(val.toString(), currency));
    }
  }, [value, defaultValue, currency]);

  const formatNumber = (valStr, curr) => {
    const digits = valStr.replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10);
    if (curr === 'INR') {
      return num.toLocaleString('en-IN');
    } else {
      return num.toLocaleString('en-US');
    }
  };

  const handleChange = (e) => {
    const formatted = formatNumber(e.target.value, currency);
    setDisplayValue(formatted);
    if (onChange) {
      const rawValue = formatted.replace(/\D/g, '');
      onChange({ target: { name, value: rawValue ? parseInt(rawValue, 10) : '' } });
    }
  };

  const rawValue = displayValue.replace(/\D/g, '');

  return (
    <>
      <input type="hidden" name={name} value={rawValue} />
      <input
        type="text"
        className={className}
        value={displayValue}
        onChange={handleChange}
        required={required}
        autoComplete="off"
      />
    </>
  );
}
