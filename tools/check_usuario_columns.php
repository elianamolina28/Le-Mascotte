<?php
header('Content-Type: text/plain; charset=utf-8');
$c = mysqli_connect('localhost','root','','lemascotte_db');
echo "USUARIO columns:\n";
$r = mysqli_query($c, "SHOW COLUMNS FROM usuario");
while($f = mysqli_fetch_assoc($r)) echo "  ".$f['Field']." (".$f['Type'].")\n";
?>