/**
 * AddressPicker.tsx
 * Componente que sustituye los TextInput de dirección por selectores/selects
 * que concatenan automáticamente los valores seleccionados para formar la dirección final.
 * 
 * Soporte multiplataforma: ModalPicker en móvil, dropdown en escritorio.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import InputValidado from './InputValidado';
import type { ValidationResult } from './InputValidado';

/* ============================================================
   CONSTANTES — Opciones de cada selector
   ============================================================ */

const TIPOS_VIA = [
  { label: 'Calle', value: 'Calle' },
  { label: 'Carrera', value: 'Carrera' },
  { label: 'Avenida', value: 'Avenida' },
  { label: 'Diagonal', value: 'Diagonal' },
  { label: 'Transversal', value: 'Transversal' },
  { label: 'Circular', value: 'Circular' },
] as const;

/** Genera números del 1 al 200 para los selectores de número */
function generarNumeros(desde = 1, hasta = 200): { label: string; value: string }[] {
  const arr: { label: string; value: string }[] = [];
  for (let i = desde; i <= hasta; i++) {
    arr.push({ label: String(i), value: String(i) });
  }
  return arr;
}

const NUMEROS = generarNumeros();

const LETRAS = [
  { label: '(Ninguna)', value: '' },
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D', value: 'D' },
  { label: 'E', value: 'E' },
  { label: 'F', value: 'F' },
  { label: 'G', value: 'G' },
  { label: 'H', value: 'H' },
  { label: 'I', value: 'I' },
  { label: 'J', value: 'J' },
  { label: 'K', value: 'K' },
  { label: 'L', value: 'L' },
  { label: 'M', value: 'M' },
  { label: 'N', value: 'N' },
  { label: 'Ñ', value: 'Ñ' },
  { label: 'O', value: 'O' },
  { label: 'P', value: 'P' },
  { label: 'Q', value: 'Q' },
  { label: 'R', value: 'R' },
  { label: 'S', value: 'S' },
  { label: 'T', value: 'T' },
  { label: 'U', value: 'U' },
  { label: 'V', value: 'V' },
  { label: 'W', value: 'W' },
  { label: 'X', value: 'X' },
  { label: 'Y', value: 'Y' },
  { label: 'Z', value: 'Z' },
];

const LOCALIDADES_BOGOTA = [
  'Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme',
  'Tunjuelito', 'Bosa', 'Kennedy', 'Fontibón', 'Engativá',
  'Suba', 'Barrios Unidos', 'Teusaquillo', 'Los Mártires', 'Antonio Nariño',
  'Puente Aranda', 'Candelaria', 'Rafael Uribe Uribe', 'Ciudad Bolívar',
];

/* ============================================================
   COLORES (coinciden con los de index.tsx)
   ============================================================ */
const C = {
  brown: '#6b124f',
  gold: '#ffd44d',
  cream: '#fcfafb',
  ink: '#2c2c2c',
  muted: '#77717a',
  softPink: '#fdeef7',
  white: '#ffffff',
  border: '#f0dcea',
  danger: '#e74c3c',
  green: '#2d6a4f',
  inputBg: '#fafaf8',
  inputBorder: '#e0d9ce',
};

/* ============================================================
   PROPS
   ============================================================ */
export type AddressPickerErrors = Partial<
  Record<'tipo_via' | 'numero_via' | 'letra_via' | 'numero_placa' | 'letra_placa' | 'localidad', string>
>;

type BasePickerProps = {
  /** Etiqueta visible */
  label: string;
  /** Array de opciones { label, value } */
  options: readonly { label: string; value: string }[];
  /** Valor actualmente seleccionado */
  value: string;
  /** Callback al seleccionar */
  onSelect: (value: string) => void;
  /** Mensaje de error, si existe */
  error?: string;
  /** Placeholder cuando no hay selección */
  placeholder?: string;
};

/* ============================================================
   SUBCOMPONENTE: BasePicker — Selector unificado mobile/desktop
   ============================================================ */
function BasePicker({ label, options, value, onSelect, error, placeholder = 'Selecciona...' }: BasePickerProps) {
  const [open, setOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web' || width < 768;

  const selectedLabel = useMemo(() => {
    const opt = options.find((o) => o.value === value);
    return opt ? opt.label : '';
  }, [options, value]);

  const handleSelect = (val: string) => {
    onSelect(val);
    setOpen(false);
  };

  // En móvil usamos un Modal nativo
  if (isMobile) {
    return (
      <View style={styles.pickerWrapper}>
        <Text style={styles.pickerLabel}>{label}</Text>
        <Pressable
          style={[styles.pickerButton, error ? styles.pickerButtonError : undefined]}
          onPress={() => setOpen(true)}
        >
          <Text style={[styles.pickerButtonText, !selectedLabel ? styles.pickerPlaceholder : undefined]}>
            {selectedLabel || placeholder}
          </Text>
          <Text style={styles.pickerArrow}>{open ? '▲' : '▼'}</Text>
        </Pressable>
        {error ? <Text style={styles.pickerError}>{error}</Text> : null}

        <Modal visible={open} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalScrim} onPress={() => setOpen(false)} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{label}</Text>
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.modalList}>
                {options.map((opt) => {
                  const active = opt.value === value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.modalItem, active && styles.modalItemActive]}
                      onPress={() => handleSelect(opt.value)}
                    >
                      <Text style={[styles.modalItemText, active && styles.modalItemTextActive]}>
                        {opt.label}
                      </Text>
                      {active ? <Text style={styles.modalCheck}>✓</Text> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // En escritorio: dropdown expandible
  return (
    <View style={styles.pickerWrapper}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <Pressable
        style={[styles.pickerButton, error ? styles.pickerButtonError : undefined]}
        onPress={() => setOpen(!open)}
      >
        <Text style={[styles.pickerButtonText, !selectedLabel ? styles.pickerPlaceholder : undefined]}>
          {selectedLabel || placeholder}
        </Text>
        <Text style={styles.pickerArrow}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {error ? <Text style={styles.pickerError}>{error}</Text> : null}
      {open && (
        <View style={styles.dropdownList}>
          <ScrollView style={{ maxHeight: 180 }}>
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                  onPress={() => handleSelect(opt.value)}
                >
                  <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

/* ============================================================
   COMPONENTE PRINCIPAL: AddressPicker
   ============================================================ */
export type AddressPickerProps = {
  // ——— Estados del padre ———
  tipoVia: string;
  setTipoVia: (v: string) => void;
  numeroVia: string;
  setNumeroVia: (v: string) => void;
  letraVia: string;
  setLetraVia: (v: string) => void;
  numeroPlaca: string;
  setNumeroPlaca: (v: string) => void;
  letraPlaca: string;
  setLetraPlaca: (v: string) => void;
  localidad: string;
  setLocalidad: (v: string) => void;
  complemento: string;
  setComplemento: (v: string) => void;

  // ——— Errores y limpieza ———
  errors: AddressPickerErrors;
  clearError: (field: keyof AddressPickerErrors) => void;

  // ——— Para compatibilidad con localidad existente ———
  showLocalidades: boolean;
  setShowLocalidades: (v: boolean) => void;
};

export default function AddressPicker({
  tipoVia, setTipoVia,
  numeroVia, setNumeroVia,
  letraVia, setLetraVia,
  numeroPlaca, setNumeroPlaca,
  letraPlaca, setLetraPlaca,
  localidad, setLocalidad,
  complemento, setComplemento,
  errors, clearError,
  showLocalidades, setShowLocalidades,
}: AddressPickerProps) {

  // ——— Dirección concatenada (solo visual) ———
  const direccionGenerada = useMemo(() => {
    const partes: string[] = [];

    // Tipo de vía + Número + Letra (ej: "Calle 10 A")
    if (tipoVia && numeroVia) {
      let via = `${tipoVia} ${numeroVia}`;
      if (letraVia) via += ` ${letraVia}`;
      partes.push(via);
    }

    // N° placa + Letra (ej: "# 50-30" o "# 50")
    if (numeroPlaca) {
      let placa = `# ${numeroPlaca}`;
      if (letraPlaca) placa += ` - ${letraPlaca}`;
      partes.push(placa);
    }

    // Complemento
    if (complemento.trim()) {
      partes.push(complemento.trim());
    }

    // Localidad
    if (localidad) {
      partes.push(localidad);
    }

    return partes.length > 0 ? partes.join(', ') : '';
  }, [tipoVia, numeroVia, letraVia, numeroPlaca, letraPlaca, complemento, localidad]);

  return (
    <View style={styles.container}>
      {/* Fila 1: Tipo de vía + Número */}
      <View style={styles.row}>
        <View style={styles.half}>
          <BasePicker
            label="Tipo de vía *"
            options={TIPOS_VIA}
            value={tipoVia}
            onSelect={(v) => { setTipoVia(v); clearError('tipo_via'); }}
            error={errors.tipo_via}
            placeholder="Tipo de vía"
          />
        </View>
        <View style={styles.half}>
          <BasePicker
            label="N° vía *"
            options={NUMEROS}
            value={numeroVia}
            onSelect={(v) => { setNumeroVia(v); clearError('numero_via'); }}
            error={errors.numero_via}
            placeholder="Ej: 10"
          />
        </View>
      </View>

      {/* Fila 2: Letra vía + N° placa */}
      <View style={styles.row}>
        <View style={styles.half}>
          <BasePicker
            label="Letra vía"
            options={LETRAS}
            value={letraVia}
            onSelect={(v) => { setLetraVia(v); clearError('letra_via'); }}
            placeholder="Opcional"
          />
        </View>
        <View style={styles.half}>
          <BasePicker
            label="N° placa *"
            options={NUMEROS}
            value={numeroPlaca}
            onSelect={(v) => { setNumeroPlaca(v); clearError('numero_placa'); }}
            error={errors.numero_placa}
            placeholder="Ej: 50"
          />
        </View>
      </View>

      {/* Fila 3: Letra placa + Localidad */}
      <View style={styles.row}>
        <View style={styles.half}>
          <BasePicker
            label="Letra placa"
            options={LETRAS}
            value={letraPlaca}
            onSelect={(v) => { setLetraPlaca(v); clearError('letra_placa'); }}
            placeholder="Opcional"
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.pickerLabel}>Localidad (Bogotá D.C.) *</Text>
          <Pressable
            style={[styles.pickerButton, errors.localidad ? styles.pickerButtonError : undefined]}
            onPress={() => setShowLocalidades(!showLocalidades)}
          >
            <Text style={[styles.pickerButtonText, !localidad ? styles.pickerPlaceholder : undefined]}>
              {localidad || 'Selecciona una localidad'}
            </Text>
            <Text style={styles.pickerArrow}>{showLocalidades ? '▲' : '▼'}</Text>
          </Pressable>
          {errors.localidad ? <Text style={styles.pickerError}>{errors.localidad}</Text> : null}
          {showLocalidades && (
            <View style={styles.dropdownList}>
              <ScrollView style={{ maxHeight: 200 }}>
                {LOCALIDADES_BOGOTA.map((loc) => (
                  <Pressable
                    key={loc}
                    style={[styles.dropdownItem, localidad === loc && styles.dropdownItemActive]}
                    onPress={() => { setLocalidad(loc); setShowLocalidades(false); clearError('localidad'); }}
                  >
                    <Text style={[styles.dropdownItemText, localidad === loc && styles.dropdownItemTextActive]}>
                      {loc}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Complemento: TextInput simple */}
      <InputValidado
        label="Complemento"
        value={complemento}
        onChangeText={(t) => { setComplemento(t); }}
        placeholder="Ej: Apartamento 301, Conjunto Cerrado"
        multiline
        validate={() => ({ isValid: true, message: '' } as ValidationResult)}
      />

      {/* Vista previa de la dirección generada */}
      {direccionGenerada !== '' && (
        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>📍 Dirección generada:</Text>
          <Text style={styles.previewText}>{direccionGenerada}</Text>
        </View>
      )}
    </View>
  );
}

/* ============================================================
   ESTILOS
   ============================================================ */
const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },

  // ——— BasePicker ———
  pickerWrapper: {
    marginBottom: 4,
  },
  pickerLabel: {
    fontWeight: '800',
    color: C.ink,
    marginTop: 12,
    marginBottom: 4,
    fontSize: 13,
  },
  pickerButton: {
    backgroundColor: C.inputBg,
    borderColor: C.inputBorder,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  pickerButtonError: {
    borderColor: C.danger,
    backgroundColor: '#fff8f7',
    marginBottom: 2,
  },
  pickerButtonText: {
    color: C.ink,
    fontSize: 14,
    flex: 1,
  },
  pickerPlaceholder: {
    color: '#aaa',
  },
  pickerArrow: {
    color: C.muted,
    fontSize: 12,
    marginLeft: 8,
  },
  pickerError: {
    color: C.danger,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginLeft: 2,
  },

  // ——— Dropdown (escritorio) ———
  dropdownList: {
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: -2,
    marginBottom: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomColor: '#f5f0f2',
    borderBottomWidth: 1,
  },
  dropdownItemActive: {
    backgroundColor: C.softPink,
  },
  dropdownItemText: {
    color: C.ink,
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: C.brown,
    fontWeight: '900',
  },

  // ——— Modal (móvil) ———
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  modalSheet: {
    maxHeight: '60%',
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomColor: C.border,
    borderBottomWidth: 1,
  },
  modalTitle: {
    color: C.brown,
    fontSize: 18,
    fontWeight: '900',
  },
  modalClose: {
    color: C.muted,
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalList: {
    paddingVertical: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomColor: '#f5f0f2',
    borderBottomWidth: 1,
  },
  modalItemActive: {
    backgroundColor: C.softPink,
  },
  modalItemText: {
    color: C.ink,
    fontSize: 16,
  },
  modalItemTextActive: {
    color: C.brown,
    fontWeight: '900',
  },
  modalCheck: {
    color: C.green,
    fontSize: 18,
    fontWeight: '900',
  },

  // ——— Vista previa ———
  previewBox: {
    backgroundColor: '#f0f8f0',
    borderColor: C.green,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    marginBottom: 8,
  },
  previewLabel: {
    color: C.green,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  previewText: {
    color: C.ink,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});