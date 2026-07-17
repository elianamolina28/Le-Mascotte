/**
 * InputValidado.tsx
 * Componente reutilizable de TextInput con validación visual instantánea.
 * Feedback inmediato: borde verde + "✓ Campo válido" o borde rojo + mensaje de error.
 * No espera al submit: valida en onChangeText (debounced) y onBlur.
 */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

export type ValidationResult = {
  isValid: boolean;
  message: string;
};

type InputValidadoProps = {
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  placeholderTextColor?: string;
  label?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  multiline?: boolean;
  style?: any;
  debounceMs?: number;
  /** Función que retorna { isValid, message } */
  validate: (value: string) => ValidationResult;
  /** Error externo (del servidor, por ejemplo) */
  externalError?: string;
  /** Callback cuando cambia la validación - útil para deshabilitar botón submit */
  onValidationChange?: (result: ValidationResult) => void;
  maxHeight?: number;
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

const C = {
  border: '#e0d9ce',
  focus: '#6b124f',
  valid: '#2d6a4f',
  invalid: '#e74c3c',
  text: '#333',
  label: '#444',
  bg: '#fafaf8',
  placeholder: '#aaa',
};

export default function InputValidado({
  value,
  onChangeText,
  onBlur,
  placeholder = '',
  placeholderTextColor = C.placeholder,
  label,
  keyboardType = 'default',
  secureTextEntry = false,
  multiline = false,
  style,
  debounceMs = 300,
  validate,
  externalError,
  onValidationChange,
  maxHeight,
  editable = true,
  autoCapitalize,
}: InputValidadoProps) {
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, message: '' });
  const [touched, setTouched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasExternal = externalError !== undefined && externalError !== '';

  const runValidation = useCallback(
    (text: string) => {
      const r = validate(text);
      setValidation(r);
      onValidationChange?.(r);
    },
    [validate, onValidationChange],
  );

  const handleChange = (text: string) => {
    onChangeText(text);
    // Validar inmediatamente en cada cambio de texto (sin debounce para feedback instantáneo)
    setTouched(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runValidation(text), debounceMs);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setTouched(true);
    runValidation(value);
    onBlur?.();
  };

  const handleFocus = () => setIsFocused(true);

  useEffect(() => {
    if (touched) runValidation(value);
  }, [value]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Color del borde
  let bc = C.border;
  if (isFocused) bc = C.focus;
  else if (touched && !isFocused) {
    if (hasExternal || (!validation.isValid && validation.message)) bc = C.invalid;
    else if (validation.isValid && value.length > 0) bc = C.valid;
  }

  const showErr = hasExternal || (touched && !validation.isValid && validation.message);
  const showOk = touched && validation.isValid && value.length > 0 && !hasExternal;
  const msg = hasExternal ? externalError : validation.message;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        editable={editable}
        autoCapitalize={autoCapitalize}
        style={[
          styles.input,
          { borderColor: bc },
          multiline && maxHeight ? { height: maxHeight } : {},
          style,
        ]}
      />
      {showErr ? <Text style={styles.err}>{msg}</Text> : null}
      {showOk && !showErr ? <Text style={styles.ok}>✓ Campo válido</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 4 },
  label: { fontWeight: '800', color: C.label, marginTop: 12, marginBottom: 4, fontSize: 13 },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: C.text,
    minHeight: 46,
  },
  err: { color: C.invalid, fontSize: 12, fontWeight: '700', marginTop: 4, marginLeft: 2 },
  ok: { color: C.valid, fontSize: 12, fontWeight: '700', marginTop: 4, marginLeft: 2 },
});