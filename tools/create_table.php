<?php
$c = mysqli_connect('localhost','root','','lemascotte_db');
$sql = "CREATE TABLE IF NOT EXISTS actividad_log (
  id_log VARCHAR(40) PRIMARY KEY,
  id_usuario VARCHAR(30) NOT NULL,
  nombre_usuario VARCHAR(100) NOT NULL DEFAULT '',
  tipo_accion VARCHAR(50) NOT NULL DEFAULT 'general',
  descripcion VARCHAR(500) NOT NULL DEFAULT '',
  id_producto VARCHAR(30) DEFAULT NULL,
  nombre_producto VARCHAR(200) DEFAULT NULL,
  metadata TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuario (id_usuario),
  INDEX idx_tipo (tipo_accion),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
if(mysqli_query($c,$sql)) echo "OK - Table created";
else echo "FAIL: ".mysqli_error($c);
?>