import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';

type UserHeaderProps = {
  userName?: string | null;
  userRole?: string | null;
  onEditProfile: () => void;
  onLogout: () => void;
  backgroundColor?: string;
};

export default function UserHeader({
  userName,
  userRole,
  onEditProfile,
  onLogout,
  backgroundColor = '#6b124f',
}: UserHeaderProps) {
  const displayName = userName || 'Usuario';
  const firstName = displayName.split(' ')[0];
  const roleLabel = userRole
    ? userRole.toLowerCase().includes('admin')
      ? 'Administrador'
      : userRole.toLowerCase().includes('empleado')
      ? 'Empleado'
      : 'Cliente'
    : 'Usuario';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.leftSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {firstName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.textSection}>
          <Text style={styles.greeting}>Hola,</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {firstName}
          </Text>
          <Text style={styles.roleBadge}>{roleLabel}</Text>
        </View>
      </View>
      <View style={styles.rightSection}>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
          onPress={onEditProfile}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.iconText}>✏️</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          onPress={onLogout}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Salir</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#6b124f',
    borderBottomWidth: 2,
    borderBottomColor: '#ffd44d',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        zIndex: 100,
      },
    }),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffd44d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#6b124f',
    fontSize: 20,
    fontWeight: '900',
  },
  textSection: {
    flex: 1,
  },
  greeting: {
    color: '#6b124f',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  userName: {
    color: '#6b124f',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 0,
  },
  roleBadge: {
    color: '#ffd44d',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  iconText: {
    fontSize: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231,76,60,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  logoutButtonPressed: {
    backgroundColor: '#c0392b',
  },
  logoutIcon: {
    fontSize: 14,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});