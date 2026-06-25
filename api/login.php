<?php

require 'config.php';
// Si existe un modelo específico se puede requerir, pero el proyecto actual
// tiene la clase `Database` en `core/Database.php` y la tabla `usuarios`.
// Autenticamos aquí directamente usando PDO para evitar dependencia inexistente.
// Responder siempre JSON
header('Content-Type: application/json; charset=utf-8');

// Leer datos JSON desde React Native o desde un formulario (fallback a $_POST)
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = $_POST;
}

// Aceptar distintos nombres de campo comunes
if (!isset($data['username']) && isset($data['usuario'])) {
    $data['username'] = $data['usuario'];
}
if (!isset($data['username']) && isset($data['user'])) {
    $data['username'] = $data['user'];
}
if (!isset($data['password']) && isset($data['clave'])) {
    $data['password'] = $data['clave'];
}

// Validar datos
if (!isset($data['username']) || !isset($data['password']) || $data['username'] === '' || $data['password'] === '') {
    echo json_encode([
        "success" => false,
        "message" => "Datos incompletos"
    ]);
    exit;
}

$username = trim($data['username']);
$password = $data['password'];

// Intentar iniciar sesión
try {
    $db = Database::conectar();
    $stmt = $db->prepare('SELECT id, username, password, rol FROM usuarios WHERE username = :username LIMIT 1');
    $stmt->execute([':username' => $username]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row && password_verify($password, $row['password'])) {
        echo json_encode([
            "success" => true,
            "usuario" => [
                "id" => $row["id"],
                "username" => $row["username"],
                "rol" => $row["rol"]
            ]
        ]);
    } else {
        echo json_encode([
            "success"=> false,
            "message"=> "Credenciales incorrectas"
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error del servidor",
        "error" => $e->getMessage()
    ]);
}

?>