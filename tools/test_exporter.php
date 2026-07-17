<?php
require_once __DIR__ . '/../models/ExcelExporter.php';

try {
    $exp = new ExcelExporter('Le Mascotte', 'Calle Falsa 123', __DIR__ . '/../assets/logo.png');
    $exp->setHeaders(['Fecha','Producto','Cantidad','Precio'], ['date','string','number','money']);
    $rows = [
        ['2026-07-02', 'Zapatos', 2, 125000.50],
        ['2026-07-01', 'Camisa', 1, 45000],
    ];
    $exp->addRows($rows);
    $out = __DIR__ . '/export_test.xlsx';
    if ($exp->save($out)) {
        echo "Exportado OK: $out\n";
    } else {
        echo "Error al guardar el archivo\n";
    }
} catch (Exception $e) {
    echo "Excepción: " . $e->getMessage() . "\n";
}
