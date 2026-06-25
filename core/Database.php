<?php

if (!defined('BASE_PATH')) {
    define('BASE_PATH', dirname(__DIR__));
}

class Database {
    private static $conexion;

    public static function conectar() {
        if (!self::$conexion) {
            $config = require BASE_PATH . '/config/database.php';

            // Conectar sin base de datos para crear si no existe
            $tempConexion = new PDO(
                "mysql:host={$config['host']};charset=utf8",
                $config['username'],
                $config['password'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );

            // Crear base de datos si no existe
            $tempConexion->exec("CREATE DATABASE IF NOT EXISTS {$config['database']}");

            // Ahora conectar con la base de datos
            self::$conexion = new PDO(
                "mysql:host={$config['host']};dbname={$config['database']};charset=utf8",
                $config['username'],
                $config['password'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );

            // Crear la tabla si no existe
            self::crearTablaSiNoExiste();
        }
        return self::$conexion;
    }

    private static function crearTablaSiNoExiste() {
        $db = self::$conexion;
        $result = $db->query("SHOW TABLES LIKE 'usuarios'");
        if ($result->rowCount() == 0) {
            $db->exec("CREATE TABLE usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                rol ENUM('admin', 'vendedor') NOT NULL
            )");
        }
    }
}

?>

