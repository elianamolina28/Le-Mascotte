<?php
echo json_encode([
    "success" => true,
    "message" => "El servidor está sirviendo correctamente desde models/",
    "path" => __FILE__,
    "php_version" => phpversion()
]);
?>
