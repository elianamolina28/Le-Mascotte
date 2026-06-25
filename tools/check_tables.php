<?php
header('Content-Type: text/plain; charset=utf-8');
$c = mysqli_connect('localhost','root','','lemascotte_db');
echo "Tables matching 'actividad':\n";
$r = mysqli_query($c,"SHOW TABLES LIKE '%actividad%'");
while($f=mysqli_fetch_assoc($r)) echo "  '".$f[array_keys($f)[0]]."'\n";
if(mysqli_num_rows($r)==0) echo "  NONE FOUND\n";
echo "\nAll tables:\n";
$r = mysqli_query($c,"SHOW TABLES");
while($f=mysqli_fetch_assoc($r)) echo "  ".$f[array_keys($f)[0]]."\n";
?>