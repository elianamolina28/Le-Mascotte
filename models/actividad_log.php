<?php
// Modulo de registro de actividad del usuario (user activity log)
// Almacena eventos como add/remove en carrito, wishlist, pedidos, etc.

include_once __DIR__ . '/common.php';

/**
 * Inserta un registro de actividad en la tabla actividad_log
 *
 * @param mysqli $conexion
 * @param string $userId
 * @param string $userName
 * @param string $tipoAccion  carrito_add | carrito_remove | carrito_update | wishlist_add | wishlist_remove | pedido_creado | pedido_actualizado | login
 * @param string $descripcion Texto descriptivo del evento
 * @param string|null $productId
 * @param string|null $productName
 * @param array|null $metadata Datos adicionales opcionales (json)
 * @return bool
 */
function logUserActivity($conexion, $userId, $userName, $tipoAccion, $descripcion, $productId = null, $productName = null, $metadata = null) {
    $id = 'ACTLOG' . date('YmdHis') . random_int(1000, 9999);

    $stmt = mysqli_prepare($conexion, "INSERT INTO actividad_log 
        (id_log, id_usuario, nombre_usuario, tipo_accion, descripcion, id_producto, nombre_producto, metadata) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    if (!$stmt) return false;

    $metadataJson = $metadata ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null;
    mysqli_stmt_bind_param($stmt, 'ssssssss', $id, $userId, $userName, $tipoAccion, $descripcion, $productId, $productName, $metadataJson);
    $result = mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
    return $result;
}

/**
 * Obtiene el historial de actividad con paginacion y filtros opcionales
 *
 * @param mysqli $conexion
 * @param int $limit
 * @param int $offset
 * @param string|null $filterUserId
 * @param string|null $filterTipo
 * @return array
 */
function getActivityLog($conexion, $limit = 100, $offset = 0, $filterUserId = null, $filterTipo = null) {
    $sql = "SELECT 
                a.id_log AS id,
                a.id_usuario AS user_id,
                COALESCE(u.nombre_usuario, a.nombre_usuario) AS user_name,
                a.tipo_accion AS action_type,
                a.descripcion AS description,
                a.id_producto AS product_id,
                a.nombre_producto AS product_name,
                a.metadata,
                a.created_at AS timestamp
            FROM actividad_log a
            LEFT JOIN usuario u ON u.id_usuario = a.id_usuario
            WHERE 1=1";

    $params = [];
    $types = '';

    if ($filterUserId && $filterUserId !== '') {
        $sql .= " AND id_usuario = ?";
        $params[] = $filterUserId;
        $types .= 's';
    }

    if ($filterTipo && $filterTipo !== '') {
        if ($filterTipo === 'carrito') {
            $sql .= " AND tipo_accion LIKE 'carrito_%'";
        } elseif ($filterTipo === 'wishlist') {
            $sql .= " AND tipo_accion LIKE 'wishlist_%'";
        } elseif ($filterTipo === 'pedido') {
            $sql .= " AND tipo_accion LIKE 'pedido_%'";
        } else {
            $sql .= " AND tipo_accion = ?";
            $params[] = $filterTipo;
            $types .= 's';
        }
    }

    $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $params[] = intval($limit);
    $params[] = intval($offset);
    $types .= 'ii';

    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) return [];

    if (!empty($params)) {
        mysqli_stmt_bind_param($stmt, $types, ...$params);
    }
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        if ($row['metadata']) {
            $row['metadata'] = json_decode($row['metadata'], true);
        }
        $items[] = $row;
    }
    return $items;
}

/**
 * Obtiene la lista de usuarios distintos que tienen actividad registrada
 */
function getActivityUsers($conexion) {
    $sql = "SELECT DISTINCT a.id_usuario AS id, COALESCE(u.nombre_usuario, a.nombre_usuario) AS name
            FROM actividad_log a
            LEFT JOIN usuario u ON u.id_usuario = a.id_usuario
            ORDER BY name ASC";
    $result = mysqli_query($conexion, $sql);
    $users = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $users[] = $row;
    }
    return $users;
}

/**
 * Obtiene la cantidad total de registros de actividad
 */
function getActivityCount($conexion, $filterUserId = null, $filterTipo = null) {
    $sql = "SELECT COUNT(*) AS total FROM actividad_log WHERE 1=1";
    $params = [];
    $types = '';

    if ($filterUserId && $filterUserId !== '') {
        $sql .= " AND id_usuario = ?";
        $params[] = $filterUserId;
        $types .= 's';
    }

    if ($filterTipo && $filterTipo !== '') {
        if ($filterTipo === 'carrito') {
            $sql .= " AND tipo_accion LIKE 'carrito_%'";
        } elseif ($filterTipo === 'wishlist') {
            $sql .= " AND tipo_accion LIKE 'wishlist_%'";
        } elseif ($filterTipo === 'pedido') {
            $sql .= " AND tipo_accion LIKE 'pedido_%'";
        } else {
            $sql .= " AND tipo_accion = ?";
            $params[] = $filterTipo;
            $types .= 's';
        }
    }

    $stmt = mysqli_prepare($conexion, $sql);
    if (!$stmt) return 0;

    if (!empty($params)) {
        mysqli_stmt_bind_param($stmt, $types, ...$params);
    }
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($result);
    return intval($row['total'] ?? 0);
}
?>