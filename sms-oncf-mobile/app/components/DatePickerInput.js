import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const toISO = (date) => date.toISOString().split('T')[0];

const toDisplay = (str) => {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
};

export default function DatePickerInput({
  value, onChange, minDate, placeholder = 'Sélectionner une date', inputStyle = {},
}) {
  const [show, setShow] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const min = minDate !== undefined ? minDate : today;

  const dateObj = value ? new Date(value) : new Date();
  const minDateObj = min ? new Date(min) : undefined;

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[s.btn, inputStyle]}
        activeOpacity={0.7}>
        <Text style={[s.txt, !value && s.placeholder]}>
          {value ? toDisplay(value) : placeholder}
        </Text>
        <Text style={s.icon}>📅</Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minDateObj}
          onChange={(event, selected) => {
            if (Platform.OS !== 'ios') setShow(false);
            if (event.type === 'dismissed') { setShow(false); return; }
            if (selected) onChange(toISO(selected));
            if (Platform.OS === 'ios') setShow(false);
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0D1B2A', borderWidth: 1, borderColor: '#37474F',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44,
  },
  txt:         { color: '#E0E0E0', fontSize: 14, flex: 1 },
  placeholder: { color: '#607D8B' },
  icon:        { fontSize: 16, marginLeft: 8 },
});
