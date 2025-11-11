-- Ejecuta con un usuario con privilegios (root o admin)
CREATE USER IF NOT EXISTS 'esp32'@'%' IDENTIFIED BY 'kevinesp32';
GRANT INSERT, SELECT ON `sistema_energia_eolica`.`lecturas_resumen` TO 'esp32'@'%';
GRANT SELECT ON `sistema_energia_eolica`.`usuarios` TO 'esp32'@'%';
FLUSH PRIVILEGES;
