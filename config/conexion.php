<?php

$host = "localhost";
$usuario = "root";
$contrasena = "";
$base_datos = "lemascotte_db";

$conexion = mysqli_connect($host, $usuario, $contrasena, $base_datos);

if (!$conexion) {
    die("Error de conexión: " . mysqli_connect_error());
}

?>