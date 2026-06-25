<?php
include_once __DIR__ . '/../config/conexion.php';
include_once __DIR__ . '/../models/view_helpers.php';
include_once __DIR__ . '/dash_productos_model.php';
include_once __DIR__ . '/../models/usuarios.php';

mysqli_set_charset($conexion, 'utf8mb4');
$requestBody = $_POST;

function adminHandleUserPost($conexion, &$section, &$message, &$messageType) {
    $formAction = $_POST['form_action'] ?? '';

    if ($formAction !== 'save_user' && $formAction !== 'delete_user') {
        return false;
    }

    if ($formAction === 'save_user') {
        $id = trim($_POST['id'] ?? '');
        $name = trim($_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $role = trim($_POST['role'] ?? '');
        $status = trim($_POST['status'] ?? 'Activo');

        if ($name === '' || $email === '' || $role === '') {
            $message = 'Completa todos los campos del usuario.';
            $messageType = 'error';
        } elseif (saveDashboardUser($conexion, $id, $name, $email, $role, $status)) {
            $message = 'Usuario guardado correctamente.';
        } else {
            $message = 'Error guardando usuario o correo duplicado.';
            $messageType = 'error';
        }
    }

    if ($formAction === 'delete_user') {
        $id = trim($_POST['id'] ?? '');
        if ($id !== '' && deleteDashboardUser($conexion, $id)) {
            $message = 'Usuario eliminado.';
        } else {
            $message = 'No se pudo eliminar el usuario.';
            $messageType = 'error';
        }
    }

    $section = 'usuarios';
    return true;
}

$section = $_GET['section'] ?? 'dash';
$message = '';
$messageType = 'success';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    dashHandleProductPost($conexion, $section, $message, $messageType);
    adminHandleUserPost($conexion, $section, $message, $messageType);
}

extract(dashProductState($conexion));

$users = getDashboardUsers($conexion);
$availableProductsCount = count(array_filter($products, function ($product) {
    return ($product['status'] ?? '') === 'Disponible';
}));
$userFormMode = $_GET['user_form'] ?? '';
$editUserId = $_GET['user_id'] ?? '';
$editingUser = dashFindById($users, $editUserId);
$showUserModal = $userFormMode === 'new' || ($userFormMode === 'edit' && $editingUser);
?>


