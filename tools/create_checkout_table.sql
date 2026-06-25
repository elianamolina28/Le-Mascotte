CREATE TABLE IF NOT EXISTS direccion_envio (
  id_direccion VARCHAR(30) PRIMARY KEY,
  id_usuario VARCHAR(30) NOT NULL,
  tipo_via VARCHAR(20) NOT NULL,
  numero_via VARCHAR(20) NOT NULL,
  letra_via VARCHAR(10) DEFAULT '',
  numero_placa VARCHAR(20) NOT NULL,
  letra_placa VARCHAR(10) DEFAULT '',
  localidad VARCHAR(100) NOT NULL,
  complemento VARCHAR(200) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);