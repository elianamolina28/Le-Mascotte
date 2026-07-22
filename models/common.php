<?php
// Funciones compartidas por todos los controladores AJAX.

define('DEFAULT_USER_ROLE', 'Cliente');

function sendResponse($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getValue($key, $default = '') {
    $value = $GLOBALS['requestBody'][$key] ?? ($_GET[$key] ?? $default);
    if (is_array($value)) {
        return $value;
    }
    return trim($value);
}

/**
 * Obtiene el ID de usuario autenticado.
 * Prioriza la sesión PHP, pero si no existe, usa el user_id enviado en el body.
 * Esto resuelve el problema de React Native que no envía cookies de sesión de forma confiable.
 */
function getAuthenticatedUserId() {
    if (!empty($_SESSION['id_usuario'])) {
        return $_SESSION['id_usuario'];
    }
    // Fallback: user_id enviado explícitamente en el body
    $userId = $GLOBALS['requestBody']['user_id'] ?? '';
    if (!empty($userId)) {
        return $userId;
    }
    return null;
}

function generateId($prefix) {
    return $prefix . date('YmdHis') . random_int(100, 999);
}

function normalizeRole($role) {
    $role = strtolower(trim($role));
    if ($role === 'admin' || $role === 'administrador') {
        return 'Administrador';
    }
    if ($role === 'empleado') {
        return 'Empleado';
    }
    return DEFAULT_USER_ROLE;
}

// Enviar correo de notificación simple (usa mail() del servidor).
function sendNotificationEmail($to, $subject, $body) {
    $from = 'no-reply@lemascotte.local';
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/plain; charset=UTF-8\r\n";
    $headers .= "From: Le Mascotte <{$from}>\r\n";
    // Evitar errores fatales: suprimir retorno booleano del mail
    try {
        @mail($to, $subject, $body, $headers);
        return true;
    } catch (Exception $e) {
        return false;
    }
}
?>
