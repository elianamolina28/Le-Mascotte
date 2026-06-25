<?php
// Funciones relacionadas con usuarios, autenticacion y perfil.
include_once __DIR__ . '/common.php';

function getUserByEmail($conexion, $email) {
    $stmt = mysqli_prepare($conexion, "SELECT id_usuario, nombre_usuario, correo_usuario, contrasena_usuario, rol_usuario, estado_usuario FROM usuario WHERE correo_usuario = ?");
    mysqli_stmt_bind_param($stmt, 's', $email);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    return mysqli_fetch_assoc($result);
}

function getUserById($conexion, $id) {
    $stmt = mysqli_prepare($conexion, "SELECT id_usuario, nombre_usuario, correo_usuario, rol_usuario, estado_usuario FROM usuario WHERE id_usuario = ?");
    mysqli_stmt_bind_param($stmt, 's', $id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    return mysqli_fetch_assoc($result);
}

function getUserByEmailAndId($conexion, $email, $excludeId = '') {
    $sql = "SELECT id_usuario FROM usuario WHERE correo_usuario = ?";
    if ($excludeId !== '') {
        $sql .= " AND id_usuario != ?";
    }

    $stmt = mysqli_prepare($conexion, $sql);
    if ($excludeId !== '') {
        mysqli_stmt_bind_param($stmt, 'ss', $email, $excludeId);
    } else {
        mysqli_stmt_bind_param($stmt, 's', $email);
    }
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    return mysqli_fetch_assoc($result);
}

function getDashboardUsers($conexion) {
    $sql = "SELECT id_usuario AS id, nombre_usuario AS name, correo_usuario AS email, rol_usuario AS role, estado_usuario AS status
            FROM usuario
            ORDER BY nombre_usuario ASC";
    $result = mysqli_query($conexion, $sql);
    $users = [];

    if (!$result) {
        return $users;
    }

    while ($row = mysqli_fetch_assoc($result)) {
        $users[] = $row;
    }

    return $users;
}

function searchDashboardUsers($conexion, $search = '', $role = '') {
    $sql = "SELECT id_usuario AS id, nombre_usuario AS name, correo_usuario AS email, rol_usuario AS role, estado_usuario AS status
            FROM usuario
            WHERE 1=1";
    $params = [];
    $types = '';

    if ($search !== '') {
        $sql .= " AND (nombre_usuario LIKE ? OR correo_usuario LIKE ?)";
        $searchTerm = '%' . $search . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types .= 'ss';
    }

    if ($role !== '') {
        $sql .= " AND rol_usuario = ?";
        $params[] = $role;
        $types .= 's';
    }

    $sql .= " ORDER BY nombre_usuario ASC";

    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) {
        return getDashboardUsers($conexion);
    }

    if (!empty($params)) {
        mysqli_stmt_bind_param($stmt, $types, ...$params);
    }

    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $users = [];

    while ($row = mysqli_fetch_assoc($result)) {
        $users[] = $row;
    }

    return $users;
}

function saveDashboardUser($conexion, $id, $name, $email, $role, $status) {
    if (getUserByEmailAndId($conexion, $email, $id)) {
        return false;
    }

    $role = normalizeRole($role);

    if ($id !== '') {
        // EDITAR USUARIO: modifica datos basicos, rol y estado de una cuenta existente.
        $stmt = mysqli_prepare($conexion, "UPDATE usuario SET nombre_usuario = ?, correo_usuario = ?, rol_usuario = ?, estado_usuario = ? WHERE id_usuario = ?");
        if (!$stmt) {
            return false;
        }
        mysqli_stmt_bind_param($stmt, 'sssss', $name, $email, $role, $status, $id);
    } else {
        // AGREGAR USUARIO: crea una cuenta nueva con clave inicial 123456.
        $newId = generateId('USR');
        $defaultPassword = password_hash('123456', PASSWORD_DEFAULT);
        $stmt = mysqli_prepare($conexion, "INSERT INTO usuario (id_usuario, nombre_usuario, correo_usuario, contrasena_usuario, rol_usuario, estado_usuario) VALUES (?, ?, ?, ?, ?, ?)");
        if (!$stmt) {
            return false;
        }
        mysqli_stmt_bind_param($stmt, 'ssssss', $newId, $name, $email, $defaultPassword, $role, $status);
    }

    return mysqli_stmt_execute($stmt);
}

function deleteDashboardUser($conexion, $id) {
    $stmt = mysqli_prepare($conexion, "SELECT correo_usuario FROM usuario WHERE id_usuario = ?");
    mysqli_stmt_bind_param($stmt, 's', $id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $user = mysqli_fetch_assoc($result);

    if ($user && $user['correo_usuario'] === 'admin@lemascotte.com') {
        return false;
    }

    // ELIMINAR USUARIO: borra la cuenta indicada; si tiene pedidos relacionados, la base puede impedirlo por llaves foraneas.
    $stmt = mysqli_prepare($conexion, "DELETE FROM usuario WHERE id_usuario = ?");
    if (!$stmt) {
        return false;
    }
    mysqli_stmt_bind_param($stmt, 's', $id);
    return mysqli_stmt_execute($stmt);
}
?>
