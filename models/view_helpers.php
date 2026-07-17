<?php
if (!function_exists('h')) {
    function h($value) {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('money')) {
    function money($value) {
        return '$' . number_format((float) $value, 0, ',', '.');
    }
}

if (!function_exists('roleColor')) {
    function roleColor($role) {
        return stripos((string) $role, 'admin') !== false ? 'var(--morado)' : 'var(--rosa)';
    }
}

if (!function_exists('statusColor')) {
    function statusColor($status) {
        return $status === 'Disponible' || $status === 'Activo' ? 'var(--verde)' : 'var(--rojo)';
    }
}

if (!function_exists('setFlashMessage')) {
    function setFlashMessage($message, $type = 'success') {
        $_SESSION['lm_flash'] = ['message' => $message, 'type' => $type];
    }
}

if (!function_exists('pullFlashMessage')) {
    function pullFlashMessage() {
        $flash = $_SESSION['lm_flash'] ?? null;
        unset($_SESSION['lm_flash']);
        return $flash;
    }
}
?>
