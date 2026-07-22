/**
 * Centralized validation utilities for admin.tsx and empleado.tsx
 * Provides real-time validation with clear error messages per field.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { COLORS, sharedStyles } from './styles';

// ========== FIELD VALIDATORS ==========

export interface ValidationResult {
  valid: boolean;
  message: string;
}

/**
 * Validate a "letters only" field (name, category, contact, ciudad, etc.)
 * Only allows letters (including accented/unicode) and spaces.
 */
export function validateLettersOnly(value: string, fieldName: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: `Ingresa ${fieldName}` };
  if (!/^[\p{L}áéíóúÁÉÍÓÚñÑüÜ\s]+$/u.test(trimmed)) {
    return { valid: false, message: `El campo "${fieldName}" solo debe contener letras y espacios` };
  }
  return { valid: true, message: '' };
}

/**
 * Validate a "numbers only" field (precio, stock, telefono, cedula, cantidad)
 * Digits, decimal point for prices, optionally negative sign for stock adjustments.
 */
export function validateNumbersOnly(value: string, fieldName: string, allowDecimal = false): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: `Ingresa ${fieldName}` };
  
  const pattern = allowDecimal ? /^[0-9]+(\.[0-9]{1,2})?$/ : /^[0-9]+$/;
  if (!pattern.test(trimmed)) {
    const extra = allowDecimal ? ' (solo números y punto decimal)' : ' (solo números)';
    return { valid: false, message: `El campo "${fieldName}" debe contener${extra}` };
  }
  return { valid: true, message: '' };
}

/**
 * Validate product name: letters and spaces only.
 */
export function validateProductName(value: string): ValidationResult {
  return validateLettersOnly(value, 'el nombre del producto');
}

/**
 * Validate category: letters and spaces only.
 */
export function validateCategory(value: string): ValidationResult {
  if (!value) return { valid: false, message: 'Selecciona una categoría' };
  // Category comes from chip selector, so it's always valid if selected
  return { valid: true, message: '' };
}

/**
 * Validate price: positive number with optional 2 decimal places.
 */
export function validatePrice(value: number | string): ValidationResult {
  const strVal = String(value);
  if (!strVal.trim()) return { valid: false, message: 'Ingresa un precio' };
  const num = Number(strVal);
  if (!Number.isFinite(num) || num <= 0) {
    return { valid: false, message: 'Ingresa un precio mayor a 0' };
  }
  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(strVal.trim())) {
    return { valid: false, message: 'Precio inválido (solo números y hasta 2 decimales)' };
  }
  return { valid: true, message: '' };
}

/**
 * Validate stock: non-negative integer.
 */
export function validateStock(value: number | string): ValidationResult {
  const strVal = String(value);
  if (!strVal.trim()) return { valid: false, message: 'Ingresa el stock' };
  const num = Number(strVal);
  if (!Number.isInteger(num) || num < 0) {
    return { valid: false, message: 'El stock debe ser un número entero no negativo' };
  }
  return { valid: true, message: '' };
}

/**
 * Validate phone: 7-15 digits.
 */
export function validatePhone(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: true, message: '' }; // optional field
  if (!/^[0-9]{7,15}$/.test(trimmed)) {
    return { valid: false, message: 'Teléfono inválido (debe contener 7-15 dígitos)' };
  }
  return { valid: true, message: '' };
}

/**
 * Validate email format.
 */
export function validateEmail(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: true, message: '' }; // optional
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { valid: false, message: 'Ingresa un correo electrónico válido' };
  }
  return { valid: true, message: '' };
}

/**
 * Validate cédula / ID: numbers only, 5-15 digits.
 */
export function validateCedula(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: 'Ingresa la cédula' };
  if (!/^[0-9]{5,15}$/.test(trimmed)) {
    return { valid: false, message: 'La cédula debe contener solo números (5-15 dígitos)' };
  }
  return { valid: true, message: '' };
}

/**
 * Validate NIT / ID Fiscal: alphanumeric with optional dashes.
 */
export function validateNIT(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: 'Ingresa el NIT/ID fiscal' };
  if (!/^[a-zA-Z0-9-]{4,20}$/.test(trimmed)) {
    return { valid: false, message: 'NIT inválido (solo letras, números y guiones)' };
  }
  return { valid: true, message: '' };
}

/**
 * Validate user name: letters and spaces only.
 */
export function validateUserName(value: string): ValidationResult {
  return validateLettersOnly(value, 'el nombre');
}

/**
 * Validate proveedor name: letters and spaces only.
 */
export function validateProveedorName(value: string): ValidationResult {
  return validateLettersOnly(value, 'el nombre del proveedor');
}

// ========== REACT COMPONENT ==========

/**
 * Renders an inline error message above or below a field.
 * Uses absolute positioning approach with z-index to not break layout.
 */
export function ValidationError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={{
      backgroundColor: '#fff0f0',
      borderWidth: 1,
      borderColor: COLORS.danger,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginTop: 4,
      marginBottom: 2,
    }}>
      <Text style={{
        color: COLORS.danger,
        fontSize: 12,
        fontWeight: '700',
      }}>⚠ {message}</Text>
    </View>
  );
}

/**
 * Determines the error state for a given input style.
 * Returns inputError style object if there's an error, undefined otherwise.
 */
export function inputErrorStyle(error?: string) {
  return error ? sharedStyles.inputError : undefined;
}

// ========== FIELD ERROR MAP HELPERS ==========

/**
 * Get validation rules for product fields.
 */
export function validateProductField(field: string, value: string | number): string {
  switch (field) {
    case 'name': return validateProductName(String(value)).message;
    case 'category': return validateCategory(String(value)).message;
    case 'price': return validatePrice(value).message;
    case 'stock': return validateStock(value).message;
    default: return '';
  }
}

/**
 * Get validation rules for user fields.
 */
export function validateUserField(field: string, value: string): string {
  switch (field) {
    case 'name': return validateUserName(value).message;
    case 'email': return validateEmail(value).message;
    default: return '';
  }
}

/**
 * Get validation rules for proveedor fields.
 */
export function validateProveedorField(field: string, value: string): string {
  switch (field) {
    case 'nombre': return validateProveedorName(value).message;
    case 'nit': return validateNIT(value).message;
    case 'telefono': return validatePhone(value).message;
    case 'email': return validateEmail(value).message;
    default: return '';
  }
}