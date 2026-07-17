<?php
// Modelo de gestión de proveedores para Le Mascotte
// Funciones CRUD para la tabla proveedor

function getDashboardProveedores($conexion) {
    $query = "SELECT id_proveedor, nombre_proveedor, contacto_proveedor, nit_proveedor, 
                     direccion_proveedor, telefono_proveedor, email_proveedor, estado_proveedor,
                     created_at, updated_at
              FROM proveedor 
              ORDER BY created_at DESC";
    $result = mysqli_query($conexion, $query);
    if (!$result) return [];

    $proveedores = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $proveedores[] = [
            'id'          => $row['id_proveedor'],
            'nombre'      => $row['nombre_proveedor'],
            'contacto'    => $row['contacto_proveedor'],
            'nit'         => $row['nit_proveedor'],
            'direccion'   => $row['direccion_proveedor'],
            'telefono'    => $row['telefono_proveedor'],
            'email'       => $row['email_proveedor'],
            'estado'      => $row['estado_proveedor'],
            'created_at'  => $row['created_at'],
            'updated_at'  => $row['updated_at'],
        ];
    }
    return $proveedores;
}

function searchDashboardProveedores($conexion, $search, $estado) {
    $conditions = [];
    $params = [];
    $types = '';

    if ($search !== '') {
        $conditions[] = "(nombre_proveedor LIKE ? OR nit_proveedor LIKE ? OR contacto_proveedor LIKE ?)";
        $searchParam = '%' . $search . '%';
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $types .= 'sss';
    }
    if ($estado !== '') {
        $conditions[] = "estado_proveedor = ?";
        $params[] = $estado;
        $types .= 's';
    }

    $where = '';
    if (!empty($conditions)) {
        $where = 'WHERE ' . implode(' AND ', $conditions);
    }

    $query = "SELECT id_proveedor, nombre_proveedor, contacto_proveedor, nit_proveedor,
                     direccion_proveedor, telefono_proveedor, email_proveedor, estado_proveedor,
                     created_at, updated_at
              FROM proveedor 
              $where 
              ORDER BY created_at DESC";

    $stmt = mysqli_prepare($conexion, $query);
    if ($stmt) {
        if (!empty($params)) {
            mysqli_stmt_bind_param($stmt, $types, ...$params);
        }
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
    } else {
        $result = mysqli_query($conexion, $query);
    }

    if (!$result) return [];

    $proveedores = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $proveedores[] = [
            'id'          => $row['id_proveedor'],
            'nombre'      => $row['nombre_proveedor'],
            'contacto'    => $row['contacto_proveedor'],
            'nit'         => $row['nit_proveedor'],
            'direccion'   => $row['direccion_proveedor'],
            'telefono'    => $row['telefono_proveedor'],
            'email'       => $row['email_proveedor'],
            'estado'      => $row['estado_proveedor'],
            'created_at'  => $row['created_at'],
            'updated_at'  => $row['updated_at'],
        ];
    }
    return $proveedores;
}

function saveDashboardProveedor($conexion, $id, $nombre, $contacto, $nit, $direccion, $telefono, $email, $estado) {
    if ($id === '') {
        // Nuevo proveedor
        $newId = 'PROV' . date('YmdHis') . random_int(100, 999);
        $stmt = mysqli_prepare($conexion, "INSERT INTO proveedor 
            (id_proveedor, nombre_proveedor, contacto_proveedor, nit_proveedor, direccion_proveedor, telefono_proveedor, email_proveedor, estado_proveedor) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        mysqli_stmt_bind_param($stmt, 'ssssssss', $newId, $nombre, $contacto, $nit, $direccion, $telefono, $email, $estado);
        $ok = mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        return $ok;
    } else {
        // Actualizar proveedor existente
        $stmt = mysqli_prepare($conexion, "UPDATE proveedor SET 
            nombre_proveedor = ?, contacto_proveedor = ?, nit_proveedor = ?, 
            direccion_proveedor = ?, telefono_proveedor = ?, email_proveedor = ?, 
            estado_proveedor = ? 
            WHERE id_proveedor = ?");
        mysqli_stmt_bind_param($stmt, 'ssssssss', $nombre, $contacto, $nit, $direccion, $telefono, $email, $estado, $id);
        $ok = mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        return $ok;
    }
}

function deleteDashboardProveedor($conexion, $id) {
    $stmt = mysqli_prepare($conexion, "DELETE FROM proveedor WHERE id_proveedor = ?");
    mysqli_stmt_bind_param($stmt, 's', $id);
    $ok = mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
    return $ok;
}