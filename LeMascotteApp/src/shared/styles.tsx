import React from 'react';
import { StyleSheet, Platform, Pressable, Text } from 'react-native';

export const COLORS = {
  primary: '#7a1458',
  accent: '#ffd44d',
  danger: '#e74c3c',
  success: '#2d6a4f',
  bg: '#efe6ef',
  shadow: 'rgba(0,0,0,0.12)',
  info: '#0d6efd',
  warning: '#ffc107',
  secondary: '#6f42c1',
};

export const sharedStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7eef8' },
  container: { padding: 18, paddingBottom: 80 },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0dcea',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  logoWrap: { flexDirection: 'row', alignItems: 'center' },
  logoImg: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fdeef7', marginRight: 10 },
  logoText: { fontWeight: '900', color: COLORS.primary, fontSize: 18 },
  navLinksScroll: { flexDirection: 'row', flex: 1, marginLeft: 10 },
  navLink: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 6 },
  navLinkText: { color: '#6b124f', fontWeight: '700', fontSize: 12 },
  navLinkTextActive: { color: '#fff', fontWeight: '900', fontSize: 12 },
  navLinkActive: { backgroundColor: COLORS.primary },
  hostConfigBtn: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0dcea',
  },
  hostConfigText: { color: '#6b124f', fontWeight: '700' },
  alert: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: Platform.OS === 'web' ? 22 : 54,
    borderRadius: 14,
    elevation: 40,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    zIndex: 9999,
  },
  alertSuccess: { backgroundColor: COLORS.success },
  alertError: { backgroundColor: COLORS.danger },
  alertText: { color: '#fff', fontWeight: '700' },
  headerSection: { alignItems: 'center', marginVertical: 18 },
  pageTitle: { fontSize: 28, color: COLORS.primary, fontWeight: '900' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  moduleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    minHeight: 160,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 7,
    marginRight: 14,
  },
  moduleIcon: { fontSize: 32, marginBottom: 12 },
  moduleTitle: { fontWeight: '900', marginTop: 6, color: COLORS.primary, fontSize: 16 },
  moduleCount: { marginTop: 8, color: '#6b124f', fontWeight: '700' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    flexWrap: 'wrap',
  },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  sectionSubtext: { fontSize: 13, color: '#888', fontWeight: '700', marginTop: 4 },
  infoCard: {
    backgroundColor: '#f0e8ff',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoCardText: { color: '#555', fontSize: 13, lineHeight: 20 },
  btnAdd: {
    backgroundColor: '#198754',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  btnAddText: { color: '#fff', fontWeight: '900' },
  btnDanger: {
    backgroundColor: '#fff',
    borderColor: COLORS.danger,
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDangerText: { color: COLORS.danger, fontWeight: '800' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0d9ce',
    marginTop: 12,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#333' },
  clearBtn: { padding: 8, marginLeft: 8 },
  clearBtnText: { color: '#999', fontWeight: '700', fontSize: 16 },
  filterRow: { marginTop: 10, marginBottom: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0d9ce',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { color: '#666', fontWeight: '700', fontSize: 13 },
  filterChipTextActive: { color: '#fff', fontWeight: '800', fontSize: 13 },
  tableWrap: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0dcea',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 6,
  },
  tableRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center' },
  tableHead: { backgroundColor: COLORS.primary, borderBottomWidth: 1, borderBottomColor: '#f0dcea' },
  tableBodyRow: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0dcea' },
  td: { flex: 1, minWidth: 80 },
  tdText: { color: '#2c2c2c', fontSize: 14 },
  tdSubText: { color: '#888', fontSize: 11, marginTop: 2 },
  tdHeader: { fontWeight: '900', color: '#fff', fontSize: 12 },
  tdPrice: { color: '#8d1c69', fontWeight: '900' },
  rowImg: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#fdeef7' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  statusBadgeText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  featuredBadge: { backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  featuredBadgeText: { color: COLORS.primary, fontWeight: '900', fontSize: 15 },
  actionBtn: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    marginRight: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnText: { color: '#fff', fontWeight: '900' },
  actionBtnOutline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnOutlineText: { color: '#dc3545', fontWeight: '900' },
  actionBtnSuccess: {
    backgroundColor: '#198754',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    marginRight: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnSuccessText: { color: '#fff', fontWeight: '900' },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalContent: {
    backgroundColor: '#fff',
    width: '92%',
    maxWidth: 720,
    borderRadius: 18,
    padding: 22,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary, marginBottom: 10 },
  inputLabel: { fontWeight: '800', color: '#444', marginTop: 12 },
  input: {
    backgroundColor: '#fafaf8',
    borderColor: '#e0d9ce',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  inputError: { borderColor: COLORS.danger, backgroundColor: '#fff8f7' },
  inputErrorText: { color: COLORS.danger, fontSize: 12, fontWeight: '700', marginTop: 5 },
  categoryChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0d9ce',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  categoryChipText: { color: '#444', fontWeight: '700' },
  categoryChipTextActive: { color: COLORS.primary, fontWeight: '900' },
  statusChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0d9ce', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  statusChipActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  statusText: { color: '#444', fontWeight: '700' },
  statusTextActive: { color: '#fff', fontWeight: '800' },
  statsCenter: { alignItems: 'center', paddingVertical: 24 },
  statsCard: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0dcea',
  },
  statsNumber: { fontSize: 36, color: COLORS.primary, fontWeight: '900' },
  statsLabel: { fontSize: 14, color: '#666', marginTop: 8, fontWeight: '800' },
  orderDetailSection: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  orderDetailLabel: { fontWeight: '800', color: '#444', fontSize: 13, marginBottom: 2 },
  orderDetailValue: { color: '#333', fontSize: 14, fontWeight: '600' },
  orderDetailSubValue: { color: '#888', fontSize: 12, marginTop: 2 },
  orderProductRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    alignItems: 'center',
  },
  statusChangeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 2, marginRight: 6, marginBottom: 6 },
  statusChangeChipText: { fontWeight: '800', fontSize: 12 },
  featuredRow: { backgroundColor: '#fffff0' },
});

export function money(v: number): string {
  return `$${v.toLocaleString('es-CO')}`;
}

export function statusColor(s: string | undefined): string {
  if (!s) return '#e74c3c';
  const value = s.toString().trim().toLowerCase();
  // Estados de pedido - match exact first, then partial
  if (value === 'pendiente') return '#ffc107';
  if (value === 'preparando' || value === 'proceso') return '#0d6efd';
  if (value === 'enviado') return '#6f42c1';
  if (value === 'entregado') return '#2d6a4f';
  if (value === 'cancelado') return '#e74c3c';
  // Partial matches for safety
  if (value.startsWith('pend')) return '#ffc107';
  if (value.startsWith('prep') || value.startsWith('proc')) return '#0d6efd';
  if (value.startsWith('env')) return '#6f42c1';
  if (value.startsWith('entr')) return '#2d6a4f';
  if (value.startsWith('cancel') || value.startsWith('canc')) return '#e74c3c';
  // Estados de usuario/producto/proveedor
  if (value.includes('activo') || value.includes('dispon')) return '#2d6a4f';
  if (value.includes('bloque') || value.includes('agot') || value.includes('inact')) return '#e74c3c';
  return '#6b124f';
}

export function roleColor(role: string | undefined): string {
  if (!role) return '#888';
  const value = role.toLowerCase();
  if (value.includes('admin')) return '#6b124f';
  if (value.includes('emple')) return '#2d6a4f';
  return '#888';
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
}

export function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[sharedStyles.filterChip, active && sharedStyles.filterChipActive]}>
      <Text style={[sharedStyles.filterChipText, active && sharedStyles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}