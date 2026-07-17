import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { User, updateUserProfile, saveUserSession, validateProfileField } from '../../utils/AuthService';

const colors = {
  cream: '#fcfafb',
  brown: '#6b124f',
  gold: '#ffd44d',
  fuchsia: '#8d1c69',
  ink: '#2c2c2c',
  muted: '#77717a',
  softPink: '#fdeef7',
  white: '#ffffff',
  border: '#f0dcea',
  danger: '#e74c3c',
  green: '#2d6a4f',
};

type EditProfileFormProps = {
  visible: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserUpdated: (user: User) => void;
  showToast?: (message: string) => void;
};

type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  password?: string;
  current_password?: string;
};

export default function EditProfileForm({
  visible,
  onClose,
  currentUser,
  onUserUpdated,
  showToast,
}: EditProfileFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [fieldStatus, setFieldStatus] = useState<Record<string, { message: string; type: 'success' | 'error' | '' }>>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Initialize form with current user data
  useEffect(() => {
    if (currentUser && visible) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setAddress(currentUser.address || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      setFieldStatus({});
      setSuccessMessage('');
    }
  }, [currentUser, visible]);

  const clearError = useCallback((field: keyof FieldErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const updateFieldStatus = useCallback((field: string, value: string) => {
    const error = validateProfileField(field as any, value);
    if (error) {
      setFieldStatus((prev) => ({ ...prev, [field]: { message: error, type: 'error' } }));
    } else {
      setFieldStatus((prev) => ({ ...prev, [field]: { message: '✓ Correcto', type: 'success' } }));
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FieldErrors = {};

    const nameError = validateProfileField('name', name);
    if (nameError) newErrors.name = nameError;

    const emailError = validateProfileField('email', email);
    if (emailError) newErrors.email = emailError;

    const phoneError = validateProfileField('phone', phone);
    if (phoneError) newErrors.phone = phoneError;

    // If changing password, validate
    if (newPassword.length > 0) {
      if (!currentPassword) {
        newErrors.current_password = 'Ingresa tu contraseña actual';
      }
      const passError = validateProfileField('password', newPassword);
      if (passError) newErrors.password = passError;
      if (newPassword !== confirmPassword) {
        newErrors.password = 'Las contraseñas no coinciden';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSave() {
    if (!validateForm()) {
      setToastMessage('Revisa los campos marcados');
      setToastType('error');
      return;
    }

    if (!currentUser?.id) {
      setToastMessage('Usuario no autenticado');
      setToastType('error');
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, string> = {};

      // Normalize values for comparison
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedCurrentEmail = (currentUser.email || '').trim().toLowerCase();
      const normalizedPhone = phone.replace(/\D/g, '');
      const normalizedCurrentPhone = (currentUser.phone || '').replace(/\D/g, '');

      if (name !== currentUser.name) updateData.name = name.trim();
      if (normalizedEmail !== normalizedCurrentEmail) updateData.email = email.trim();
      if (normalizedPhone !== normalizedCurrentPhone) updateData.phone = normalizedPhone;
      if (address !== (currentUser.address || '')) updateData.address = address.trim();
      if (newPassword.length > 0) {
        updateData.password = newPassword;
        updateData.current_password = currentPassword;
      }

      // Only call API if there are changes
      if (Object.keys(updateData).length === 0) {
        setToastMessage('No hay cambios para guardar');
        setToastType('error');
        setSaving(false);
        return;
      }

      // Debug: log what we're sending
      console.log('[EditProfile] Sending update:', updateData);
      console.log('[EditProfile] Current password provided:', !!currentPassword);
      console.log('[EditProfile] New password length:', newPassword.length);

      const response = await updateUserProfile(currentUser.id, updateData);

      console.log('[EditProfile] Response:', response);

      if (response.success) {
        // Update local user state
        const updatedUser: User = {
          ...currentUser,
          name: name.trim() || currentUser.name,
          email: email.trim() || currentUser.email,
          phone: phone.replace(/\D/g, '') || currentUser.phone,
          address: address.trim() || currentUser.address,
        };

        // Save to AsyncStorage
        await saveUserSession(updatedUser);

        // Notify parent
        onUserUpdated(updatedUser);

        // Show success
        setSuccessMessage('¡Perfil actualizado correctamente!');
        setToastMessage('Perfil actualizado correctamente');
        setToastType('success');

        // Close after a brief delay
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setToastMessage(response.message || 'Error al actualizar el perfil');
        setToastType('error');
      }
    } catch (error) {
      setToastMessage('Error de conexión al actualizar el perfil');
      setToastType('error');
    } finally {
      setSaving(false);
    }
  }

  function renderFieldError(field: keyof FieldErrors) {
    return errors[field] ? (
      <Text style={styles.errorText}>{errors[field]}</Text>
    ) : null;
  }

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />
        
        {/* Toast overlay - ALWAYS ON TOP */}
        {toastMessage ? (
          <View style={styles.toastOverlay}>
            <View style={[styles.toastContent, toastType === 'error' ? styles.toastError : styles.toastSuccess]}>
              <Text style={styles.toastIcon}>{toastType === 'error' ? '⚠️' : '✅'}</Text>
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          </View>
        ) : null}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sheet}>
              <View style={styles.header}>
                <Text style={styles.title}>✏️ Editar Perfil</Text>
                <Pressable style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>
              </View>

              {successMessage ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successIcon}>✅</Text>
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              ) : (
                <View style={styles.body}>
                  {/* Email (editable now) */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Correo electrónico</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.email ? styles.inputError : fieldStatus.email?.type === 'success' ? styles.inputSuccess : undefined,
                      ]}
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        clearError('email');
                        updateFieldStatus('email', t);
                      }}
                      placeholder="tu@email.com"
                      placeholderTextColor="#9a8d99"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {renderFieldError('email')}
                    {fieldStatus.email?.type === 'success' && !errors.email && (
                      <Text style={styles.successText}>✓ Correo válido</Text>
                    )}
                  </View>

                  {/* Name */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Nombre *</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.name ? styles.inputError : fieldStatus.name?.type === 'success' ? styles.inputSuccess : undefined,
                      ]}
                      value={name}
                      onChangeText={(t) => {
                        setName(t);
                        clearError('name');
                        updateFieldStatus('name', t);
                      }}
                      placeholder="Tu nombre completo"
                      placeholderTextColor="#9a8d99"
                      autoCapitalize="words"
                    />
                    {renderFieldError('name')}
                    {fieldStatus.name?.type === 'success' && !errors.name && (
                      <Text style={styles.successText}>✓ Nombre válido</Text>
                    )}
                  </View>

                  {/* Phone */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Teléfono</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.phone ? styles.inputError : fieldStatus.phone?.type === 'success' ? styles.inputSuccess : undefined,
                      ]}
                      value={phone}
                      onChangeText={(t) => {
                        // Only allow numbers
                        const numericValue = t.replace(/[^0-9]/g, '');
                        setPhone(numericValue);
                        clearError('phone');
                        updateFieldStatus('phone', numericValue);
                      }}
                      placeholder="Ej: 3001234567"
                      placeholderTextColor="#9a8d99"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                    {renderFieldError('phone')}
                    {fieldStatus.phone?.type === 'success' && !errors.phone && phone.length > 0 && (
                      <Text style={styles.successText}>✓ Teléfono válido</Text>
                    )}
                  </View>

                  {/* Address */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Dirección</Text>
                    <TextInput
                      style={[
                        styles.input,
                        styles.inputMultiline,
                        errors.address ? styles.inputError : fieldStatus.address?.type === 'success' ? styles.inputSuccess : undefined,
                      ]}
                      value={address}
                      onChangeText={(t) => {
                        setAddress(t);
                        clearError('address');
                        updateFieldStatus('address', t);
                      }}
                      placeholder="Tu dirección de residencia"
                      placeholderTextColor="#9a8d99"
                      multiline
                      numberOfLines={2}
                    />
                    {renderFieldError('address')}
                    {fieldStatus.address?.type === 'success' && !errors.address && address.length > 0 && (
                      <Text style={styles.successText}>✓ Dirección válida</Text>
                    )}
                  </View>

                  {/* Divider */}
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>Cambiar contraseña</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Current Password */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Contraseña actual</Text>
                    <TextInput
                      style={[styles.input, errors.current_password ? styles.inputError : undefined]}
                      value={currentPassword}
                      onChangeText={(t) => { setCurrentPassword(t); clearError('current_password'); }}
                      placeholder="Ingresa tu contraseña actual"
                      placeholderTextColor="#9a8d99"
                      secureTextEntry
                    />
                    {renderFieldError('current_password')}
                  </View>

                  {/* New Password */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Nueva contraseña</Text>
                    <TextInput
                      style={[styles.input, errors.password ? styles.inputError : undefined]}
                      value={newPassword}
                      onChangeText={(t) => { setNewPassword(t); clearError('password'); }}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor="#9a8d99"
                      secureTextEntry
                    />
                    {renderFieldError('password')}
                  </View>

                  {/* Confirm New Password */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Confirmar nueva contraseña</Text>
                    <TextInput
                      style={[styles.input, errors.password ? styles.inputError : undefined]}
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); clearError('password'); }}
                      placeholder="Repite la nueva contraseña"
                      placeholderTextColor="#9a8d99"
                      secureTextEntry
                    />
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                      onPress={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                      )}
                    </Pressable>
                    <Pressable style={styles.cancelButton} onPress={onClose}>
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  title: {
    color: colors.brown,
    fontSize: 21,
    fontWeight: '900',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.softPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.brown,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 30,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: colors.cream,
    color: colors.ink,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 2,
  },
  inputSuccess: {
    borderColor: colors.green,
    borderWidth: 2,
  },
  readOnlyField: {
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: '#f5f0f3',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  readOnlyText: {
    color: colors.muted,
    fontSize: 14,
  },
  readOnlyNote: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 2,
    fontStyle: 'italic',
  },
  errorText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    marginLeft: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    marginTop: 20,
    gap: 10,
  },
  saveButton: {
    backgroundColor: colors.brown,
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  cancelButton: {
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 18,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  successText: {
    color: colors.green,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  // Toast overlay styles
  toastOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 18,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  toastSuccess: {
    backgroundColor: colors.green,
  },
  toastError: {
    backgroundColor: colors.danger,
  },
  toastIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  toastText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
});
