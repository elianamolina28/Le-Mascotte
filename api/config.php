<?php

// Permitir conexión desde app movil
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");

// JSON SIEMPRE
header("Content-Type: application/json");

// Ruta base del proyecto
define('BASE_PATH', dirname(__DIR__));

// Cargar conexión 
require BASE_PATH . '/core/Database.php';

?>