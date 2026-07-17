<?php
header('Content-Type: text/plain; charset=utf-8');
$c = mysqli_connect('localhost','root','','lemascotte_db');

// Check if column exists
$r = mysqli_query($c, "SHOW COLUMNS FROM usuario LIKE 'direccion_usuario'");
if (mysqli_num_rows($r) > 0) {
    echo "Column 'direccion_usuario' already exists.\n";
} else {
    $sql = "ALTER TABLE usuario ADD COLUMN direccion_usuario TEXT DEFAULT NULL AFTER telefono_usuario";
    if (mysqli_query($c, $sql)) {
        echo "Column 'direccion_usuario' added successfully.\n";
    } else {
        echo "Error adding column: " . mysqli_error($c) . "\n";
    }
}

// Show final structure
echo "\nFinal USUARIO columns:\n";
$r = mysqli_query($c, "SHOW COLUMNS FROM usuario");
while($f = mysqli_fetch_assoc($r)) echo "  ".$f['Field']." (".$f['Type'].")\n";
?>