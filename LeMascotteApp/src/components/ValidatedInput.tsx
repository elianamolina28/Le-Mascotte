/**
 * ValidatedInput.tsx
 * Componente reutilizable de TextInput con validación visual instantánea.
 * Muestra borde verde/rojo y mensaje de feedback debajo del campo.
 */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable } from 'react-native';

export type ValidationResult = {
  isValid: boolean;
  message: string;
};

type ValidatedInputProps = {
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
  /** Función que retorna { isValid, message }. Retorna { isValid: true, message: '' } si es válido */
  validate: (value: string) => ValidationResult;
  /** Si se pasa, se muestra como feedback visual (útil para control externo) */
  externalError?: string;
  /** Callback cuando cambia el estado de validación */
  onValidationChange?: (result: ValidationResult) => void;
  /** Altura máxima para campos multilinea */
  maxHeight?: number;
};

const COLORS = {
  border: '#e0d9ce',
  borderFocus: '#6b124f',
  valid: '#2d6a4f',
  invalid: '#e74c3c',
  text: '#333',
  label: '#444',
  bg: '#fafaf8',
  placeholder: '#aaa',
};

export default function ValidatedInput({
  value,
  onChangeText,
  onBlur,
  placeholder = '',
  placeholderTextColor = COLORS.placeholder,
  label,
  keyboardType = 'default',
  secureTextEntry = false,
  multiline = false,
  style,
  debounceMs = 400,
  validate,
  externalError,
  onValidationChange,
  maxHeight,
}: ValidatedInputProps) {
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, message: '' });
  const [touched, setTouched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasExternalError = externalError !== undefined && externalError !== '';

  const runValidation = useCallback(
    (text: string) => {
      const result = validate(text);
      setValidation(result);
      onValidationChange?.(result);
    },
    [validate, onValidationChange],
  );

  const handleChange = (text: string) => {
    onChangeText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Pequeño debounce para no sobrecargar en cada letra
    debounceRef.current = setTimeout(() => {
      setTouched(true);
      runValidation(text);
    }, debounceMs);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setTouched(true);
    runValidation(value);
    onBlur?.();
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  // Re-validate if value changes externally
  useEffect(() => {
    if (touched && value !== undefined) {
      runValidation(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Determinar color del borde
  let borderColor = COLORS.border;
  if (isFocused) borderColor = COLORS.borderFocus;
  if (touched && !isFocused) {
    if (hasExternalError || (!validation.isValid && validation.message)) {
      borderColor = COLORS.invalid;
    } else if (validation.isValid && value.length > 0) {
      borderColor = COLORS.valid;
    }
  }

  // Determinar mensaje y color
  const showError = hasExternalError || (touched && !validation.isValid && validation.message);
  const showSuccess = touched && validation.isValid && value.length > 0 && !hasExternalError;
  const feedbackMessage = hasExternalError ? externalError : validation.message;

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
        style={[
          styles.input,
          { borderColor },
          multiline && maxHeight ? { height: maxHeight } : {},
          style,
        ]}
      />
      {showError ? (
        <Text style={styles.errorText}>{feedbackMessage}</Text>
      ) : null}
      {showSuccess && !showError ? (
        <Text style={styles.successText}>✓ Campo válido</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  label: {
    fontWeight: '800',
    color: COLORS.label,
    marginTop: 12,
    marginBottom: 4,
    fontSize: 13,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 46,
    borderColor: COLORS.border,
  },
  errorText: {
    color: COLORS.invalid,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    marginLeft: 2,
  },
  successText: {
    color: COLORS.valid,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    marginLeft: 2,
  },
});