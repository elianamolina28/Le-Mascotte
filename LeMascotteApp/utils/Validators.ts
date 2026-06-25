/**
 * Validators.ts
 * Funciones de validación reutilizables para todos los formularios.
 * Cada función retorna un ValidationResult: { isValid: boolean, message: string }
 */

export type ValidationResult = {
  isValid: boolean;
  message: string;
};

// Helper para crear resultados
const valid: ValidationResult = { isValid: true, message: '' };
const invalid = (msg: string): ValidationResult => ({ isValid: false, message: msg });

// ============================================================
// REGEX
// ============================================================
const RE_ONLY_LETTERS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/;
const RE_ONLY_NUMBERS = /^[0-9]*$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_URL = /^https?:\/\/\S+$/i;
const RE_PHONE = /^[0-9]{7,15}$/;
const RE_PHONE_CO = /^[0-9]{10}$/;

// ============================================================
// VALIDATORS
// ============================================================

/** Campo de solo letras (nombre, apellido, categoría, etc.) */
export function validateOnlyLetters(value: string, fieldName: string): ValidationResult {
  if (!value.trim()) return invalid(`${fieldName} es obligatorio`);
  if (!RE_ONLY_LETTERS.test(value)) return invalid('Este campo solo permite letras');
  return valid;
}

/** Campo numérico (precio, stock, cantidad, etc.) */
export function validateNumeric(value: string, fieldName: string, allowZero = false): ValidationResult {
  if (!value.trim()) return invalid(`${fieldName} es obligatorio`);
  if (!RE_ONLY_NUMBERS.test(value.replace('.', '').replace('-', ''))) return invalid('Este campo solo permite números');
  const num = Number(value);
  if (!Number.isFinite(num)) return invalid('Valor numérico inválido');
  if (!allowZero && num <= 0) return invalid(`${fieldName} debe ser mayor a 0`);
  if (num < 0) return invalid(`${fieldName} no puede ser negativo`);
  return valid;
}

/** Campo obligatorio genérico */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value.trim()) return invalid(`${fieldName} es obligatorio`);
  return valid;
}

/** Email */
export function validateEmail(value: string): ValidationResult {
  if (!value.trim()) return invalid('El correo es obligatorio');
  if (!RE_EMAIL.test(value)) return invalid('Formato de correo inválido');
  return valid;
}

/** Teléfono Colombia (10 dígitos) */
export function validatePhoneCo(value: string): ValidationResult {
  if (!value.trim()) return invalid('El teléfono es obligatorio');
  const digits = value.replace(/\D/g, '');
  if (!RE_PHONE_CO.test(digits)) return invalid('Debe tener exactamente 10 dígitos');
  return valid;
}

/** Teléfono genérico (7-15 dígitos) */
export function validatePhone(value: string): ValidationResult {
  if (!value.trim()) return invalid('El teléfono es obligatorio');
  const digits = value.replace(/\D/g, '');
  if (!RE_PHONE.test(digits)) return invalid('Teléfono inválido (7-15 dígitos)');
  return valid;
}

/** URL de imagen */
export function validateImageUrl(value: string): ValidationResult {
  if (!value.trim()) return valid;
  if (!RE_URL.test(value.trim())) return invalid('La URL debe comenzar con http:// o https://');
  return valid;
}

/** Contraseña (mínimo 6 caracteres) */
export function validatePassword(value: string): ValidationResult {
  if (!value) return invalid('La contraseña es obligatoria');
  if (value.length < 6) return invalid('Debe tener al menos 6 caracteres');
  return valid;
}

/** Confirmar contraseña */
export function validatePasswordMatch(password: string, confirmation: string): ValidationResult {
  if (!confirmation) return invalid('Confirma tu contraseña');
  if (password !== confirmation) return invalid('Las contraseñas no coinciden');
  return valid;
}

/** NIT / ID Fiscal */
export function validateNit(value: string): ValidationResult {
  if (!value.trim()) return invalid('El NIT es obligatorio');
  return valid;
}

/** Stock (puede ser 0) */
export function validateStock(value: string): ValidationResult {
  if (value === '' || value === undefined || value === null) return invalid('El stock es obligatorio');
  const digits = value.replace(/\D/g, '');
  if (digits === '') return invalid('El stock es obligatorio');
  const num = Number(digits);
  if (!Number.isFinite(num) || num < 0) return invalid('El stock no puede ser negativo');
  return valid;
}

/** Precio / Valor (mayor a 0) */
export function validatePrice(value: string, fieldName: string): ValidationResult {
  if (!value.trim()) return invalid(`${fieldName} es obligatorio`);
  const num = Number(value.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num) || num <= 0) return invalid(`${fieldName} debe ser mayor a 0`);
  return valid;
}

/** Cédula / ID numérico */
export function validateCedula(value: string): ValidationResult {
  if (!value.trim()) return invalid('Ingresa tu cédula');
  const digits = value.replace(/\D/g, '');
  if (digits.length < 5) return invalid('Cédula inválida');
  return valid;
}

// ============================================================
// HOOK HELPER
// ============================================================
export function hasErrors(errorMap: Record<string, ValidationResult | undefined>): boolean {
  return Object.values(errorMap).some((v) => v && !v.isValid);
}