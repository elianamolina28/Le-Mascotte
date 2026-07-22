<?php
/**
 * ExcelExporter - Exportador XLSX usando PhpSpreadsheet
 *
 * Reemplaza la antigua generación manual de XML por PhpSpreadsheet para
 * facilitar mantenimiento y aplicar estilos profesionales.
 * Requisitos: instalar la dependencia:
 *   composer require phpoffice/phpspreadsheet
 */

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Shared\Date as PhpExcelDate;

class ExcelExporter {
    private $empresa;
    private $direccion;
    private $logoPath;
    private $rows = [];
    private $headers = [];
    private $dataTypes = []; // 'string','number','money','date'

    public function __construct($empresa = 'Le Mascotte', $direccion = '', $logoPath = './assets/logo.png') {
        $this->empresa = $empresa;
        $this->direccion = $direccion;
        $this->logoPath = $logoPath;

        // Intentar cargar autoloader si PhpSpreadsheet no está disponible
        if (!class_exists('PhpOffice\\PhpSpreadsheet\\Spreadsheet')) {
            $autoload = __DIR__ . '/../vendor/autoload.php';
            if (file_exists($autoload)) {
                require_once $autoload;
            }
        }
    }

    public function setHeaders(array $headers, array $types = []) {
        $this->headers = $headers;
        $this->dataTypes = $types;
    }

    public function addRow(array $row) {
        $this->rows[] = $row;
    }

    public function addRows(array $rows) {
        foreach ($rows as $r) $this->addRow($r);
    }

    public function download($filename = 'reporte') {
        $xlsxData = $this->generateXLSX();

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '.xlsx"');
        header('Cache-Control: max-age=0');
        header('Content-Length: ' . strlen($xlsxData));

        echo $xlsxData;
        exit;
    }

    public function save($path) {
        $xlsxData = $this->generateXLSX();
        return file_put_contents($path, $xlsxData) !== false;
    }

    /**
     * Genera el XLSX y devuelve el contenido binario
     * @return string
     */
    private function generateXLSX() {
        if (!class_exists('PhpOffice\\PhpSpreadsheet\\Spreadsheet')) {
            throw new \Exception('PhpSpreadsheet no está instalado. Ejecuta: composer require phpoffice/phpspreadsheet');
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Reporte');

        // --- Header area: logo (anchored A1:B3), empresa y dirección
        $sheet->getRowDimension(1)->setRowHeight(40);
        $sheet->getRowDimension(2)->setRowHeight(20);
        $sheet->getRowDimension(3)->setRowHeight(18);

        // Merge cells for company text area (to the right of logo)
        $sheet->mergeCells('B1:E1');
        $sheet->mergeCells('B2:E2');
        $sheet->mergeCells('B3:E3');

        $sheet->setCellValue('B1', $this->empresa);
        $sheet->setCellValue('B2', $this->direccion);
        $sheet->setCellValue('B3', 'Exportado: ' . date('d/m/Y H:i'));

        // Company name style
        $sheet->getStyle('B1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('B2')->getFont()->setSize(10);
        $sheet->getStyle('B3')->getFont()->setItalic(true)->setSize(9);

        // Logo
        if (!empty($this->logoPath) && file_exists($this->logoPath)) {
            $drawing = new Drawing();
            $drawing->setPath($this->logoPath);
            $drawing->setCoordinates('A1');
            $drawing->setOffsetX(5);
            $drawing->setOffsetY(5);
            $drawing->setHeight(60);
            $drawing->setWorksheet($sheet);
            // Merge logo cells so it appears anchored to A1:B3
            $sheet->mergeCells('A1:B3');
        }

        // Leave one empty row after header area
        $headerRow = 5;

        // --- Table headers
        $colCount = count($this->headers);
        for ($i = 0; $i < $colCount; $i++) {
            $col = $this->colLetter($i);
            $sheet->setCellValue($col . $headerRow, $this->headers[$i]);
        }

        // Header styling: gray background, bold, centered
        $headerRange = 'A' . $headerRow . ':' . $this->colLetter($colCount - 1) . $headerRow;
        $sheet->getStyle($headerRange)->getFont()->setBold(true);
        $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFD3D3D3');
        $sheet->getStyle($headerRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getRowDimension($headerRow)->setRowHeight(22);

        // --- Data rows
        $dataRowStart = $headerRow + 1;
        foreach ($this->rows as $rIndex => $row) {
            $excelRow = $dataRowStart + $rIndex;
            $isEven = ($rIndex % 2) === 0;
            for ($c = 0; $c < $colCount; $c++) {
                $col = $this->colLetter($c);
                $cell = $col . $excelRow;
                $value = isset($row[$c]) ? $row[$c] : null;
                $type = $this->dataTypes[$c] ?? 'string';

                if ($type === 'money') {
                    $numeric = is_numeric($value) ? (float)$value : 0.0;
                    $sheet->setCellValue($cell, $numeric);
                    $sheet->getStyle($cell)->getNumberFormat()->setFormatCode('#,##0.00');
                } elseif ($type === 'number') {
                    $numeric = is_numeric($value) ? (float)$value : 0.0;
                    $sheet->setCellValue($cell, $numeric);
                } elseif ($type === 'date') {
                    // Try to parse date, preserve if already timestamp
                    $dt = null;
                    if (empty($value)) {
                        $sheet->setCellValue($cell, null);
                    } else {
                        if (is_numeric($value)) {
                            $timestamp = (int)$value;
                            $dt = $this->timestamptodate($timestamp);
                        } else {
                            $parsed = date_create($value);
                            if ($parsed) $dt = $parsed;
                        }
                        if ($dt instanceof \DateTime) {
                            $sheet->setCellValue($cell, PhpExcelDate::PHPToExcel($dt));
                            $sheet->getStyle($cell)->getNumberFormat()->setFormatCode('dd/mm/yyyy');
                        } else {
                            $sheet->setCellValue($cell, (string)$value);
                        }
                    }
                } else {
                    $sheet->setCellValue($cell, (string)$value);
                }

                // Base styles: thin border and vertical center
                $sheet->getStyle($cell)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
                $sheet->getStyle($cell)->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

                // Alternating row fill (very light)
                if ($isEven) {
                    $sheet->getStyle($cell)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFF7FBFF');
                }
            }
        }

        // Autosize columns
        for ($i = 0; $i < $colCount; $i++) {
            $sheet->getColumnDimension($this->colLetter($i))->setAutoSize(true);
        }

        // Ensure a professional default font
        $spreadsheet->getDefaultStyle()->getFont()->setName('Calibri')->setSize(11);

        // Writer to memory
        $writer = new Xlsx($spreadsheet);
        ob_start();
        $writer->save('php://output');
        $data = ob_get_clean();

        return $data;
    }

    private function colLetter($index) {
        $letter = '';
        while ($index >= 0) {
            $letter = chr(65 + ($index % 26)) . $letter;
            $index = intval($index / 26) - 1;
        }
        return $letter;
    }

    private function timestamptodate($ts) {
        try {
            return (new \DateTime())->setTimestamp($ts);
        } catch (\Exception $e) {
            return null;
        }
    }
}
