import React from 'react';
import { View } from 'react-native';

// Convert a React Native style object to CSS-compatible style for an HTML element.
// Handles borderWidth+borderColor → border shorthand, and adds borderStyle.
function rnToCSS(rnStyle = {}) {
  const {
    borderWidth, borderColor, borderRadius, padding,
    backgroundColor, fontSize, color, marginTop, marginBottom, flex,
    ...rest
  } = rnStyle;
  return {
    ...(backgroundColor && { backgroundColor }),
    ...(color && { color }),
    ...(borderWidth && { border: `${borderWidth}px solid ${borderColor || '#37474F'}` }),
    ...(borderRadius != null && { borderRadius }),
    ...(padding != null && { padding }),
    ...(fontSize && { fontSize }),
    ...(marginTop != null && { marginTop }),
    ...(marginBottom != null && { marginBottom }),
  };
}

export default function DatePickerInput({
  value, onChange, minDate, placeholder = 'Sélectionner une date', inputStyle = {},
}) {
  const today = new Date().toISOString().split('T')[0];
  const min = minDate !== undefined ? minDate : today;

  return (
    <View>
      <input
        type="date"
        min={min || undefined}
        value={value || ''}
        onChange={e => onChange(e.target.value || '')}
        style={{
          backgroundColor: '#0D1B2A',
          color: '#E0E0E0',
          border: '1px solid #37474F',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 14,
          width: '100%',
          boxSizing: 'border-box',
          cursor: 'pointer',
          outline: 'none',
          colorScheme: 'dark',
          fontFamily: 'inherit',
          display: 'block',
          ...rnToCSS(inputStyle),
        }}
      />
    </View>
  );
}
