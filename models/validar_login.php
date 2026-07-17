<?php
session_start();
include_once __DIR__ . "/../config/conexion.php";
mysqli_set_charset($conexion, "utf8mb4");

$correo = trim($_POST['correo'] ?? '');
$contrasena = $_POST['contrasena'] ?? '';

if ($correo === '' || $contrasena === '') {
    echo "Completa todos los campos";
    exit();
}
if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    echo "Formato de correo invÃ¡lido";
    exit();
}
// Validar proveedor de correo
$partsV = explode('@', $correo);
$domainV = isset($partsV[1]) ? strtolower(explode('.', $partsV[1])[0]) : '';
$allowedV = ['gmail', 'hotmail', 'outlook', 'yahoo', 'live'];
if (!in_array($domainV, $allowedV)) {
    echo "Proveedor de correo no permitido";
    exit();
}

$sql = "SELECT id_usuario, nombre_usuario, correo_usuario, contrasena_usuario, rol_usuario
        FROM Usuario
        WHERE correo_usuario = ?";

$stmt = mysqli_prepare($conexion, $sql);
mysqli_stmt_bind_param($stmt, "s", $correo);
mysqli_stmt_execute($stmt);
$resultado = mysqli_stmt_get_result($stmt);

if (!$resultado || mysqli_num_rows($resultado) === 0) {
    echo "Usuario no encontrado";
    exit();
}

$fila = mysqli_fetch_assoc($resultado);
$passwordGuardada = $fila['contrasena_usuario'];
$passwordValida = password_verify($contrasena, $passwordGuardada) || $contrasena === $passwordGuardada;

if (!$passwordValida) {
    echo "ContraseÃ±a incorrecta";
    exit();
}

$_SESSION['id_usuario'] = $fila['id_usuario'];
$_SESSION['nombre_usuario'] = $fila['nombre_usuario'];
$_SESSION['rol_usuario'] = $fila['rol_usuario'];

if ($fila['rol_usuario'] === 'Administrador') {
    header("Location: admin.php");
    exit();
}

if ($fila['rol_usuario'] === 'Cliente') {
    header("Location: cliente.php");
    exit();
}

if ($fila['rol_usuario'] === 'Empleado') {
    header("Location: empleado.php");
    exit();
}

echo "Rol de usuario no vÃ¡lido";
exit();
?>

