<?php
header('Content-Type: text/plain; charset=utf-8');
$c = mysqli_connect('localhost','root','','lemascotte_db');
echo "detalle_pedido:\n";
$r = mysqli_query($c,"SHOW COLUMNS FROM detalle_pedido");
while($f=mysqli_fetch_assoc($r)) echo $f['Field']."\n";
echo "---\n";
echo "pedido:\n";
$r = mysqli_query($c,"SHOW COLUMNS FROM pedido");
while($f=mysqli_fetch_assoc($r)) echo $f['Field']."\n";
echo "---\n";
echo "Producto:\n";
$r = mysqli_query($c,"SHOW COLUMNS FROM Producto");
while($f=mysqli_fetch_assoc($r)) echo $f['Field']."\n";
?>