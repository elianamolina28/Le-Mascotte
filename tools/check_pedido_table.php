<?php
header('Content-Type: text/plain; charset=utf-8');
include_once __DIR__ . '/../config/conexion.php';
$r = mysqli_query($conexion, 'DESCRIBE pedido');
while($f = mysqli_fetch_assoc($r)) {
    echo $f['Field'] . ' - ' . $f['Type'] . PHP_EOL;
}
?>