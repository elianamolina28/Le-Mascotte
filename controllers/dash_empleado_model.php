<?php
include_once __DIR__ . '/../config/conexion.php';
include_once __DIR__ . '/../models/view_helpers.php';
include_once __DIR__ . '/dash_productos_model.php';

mysqli_set_charset($conexion, 'utf8mb4');
$requestBody = $_POST;

$section = $_GET['section'] ?? 'dash';
$message = '';
$messageType = 'success';

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method === 'POST') {
    dashHandleProductPost($conexion, $section, $message, $messageType);
}

extract(dashProductState($conexion));
?>

