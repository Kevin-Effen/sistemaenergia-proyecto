# Host: localhost  (Version 5.5.5-10.4.32-MariaDB)
# Date: 2025-10-25 15:53:15
# Generator: MySQL-Front 6.0  (Build 2.20)


#
# Structure for table "auditoria_usuarios"
#

DROP TABLE IF EXISTS `auditoria_usuarios`;
CREATE TABLE `auditoria_usuarios` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `actor_cuenta_id` smallint(5) unsigned NOT NULL,
  `accion` enum('CREAR','ACTUALIZAR','ELIMINAR') NOT NULL,
  `objetivo_cuenta_id` smallint(5) unsigned DEFAULT NULL,
  `detalle` varchar(255) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `actor_cuenta_id` (`actor_cuenta_id`),
  KEY `objetivo_cuenta_id` (`objetivo_cuenta_id`),
  CONSTRAINT `fk_aud_actor` FOREIGN KEY (`actor_cuenta_id`) REFERENCES `cuentas` (`id_cuenta`) ON UPDATE CASCADE,
  CONSTRAINT `fk_aud_obj` FOREIGN KEY (`objetivo_cuenta_id`) REFERENCES `cuentas` (`id_cuenta`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

#
# Data for table "auditoria_usuarios"
#

INSERT INTO `auditoria_usuarios` VALUES (1,1,'CREAR',2,'{\"usuario\":\"Laura\",\"rol\":\"usuario\"}','2025-08-15 02:06:56'),(2,1,'CREAR',3,'{\"usuario\":\"cuba@gmail.com\",\"rol\":\"administrador\"}','2025-08-22 00:27:41'),(3,3,'CREAR',4,'{\"usuario\":\"countableuncountable@gmail.com\",\"rol\":\"administrador\"}','2025-09-02 00:15:11'),(4,4,'CREAR',5,'{\"usuario\":\"cubanaely@gmail.com\",\"rol\":\"usuario\"}','2025-09-10 23:59:09'),(5,4,'ACTUALIZAR',NULL,'{\"id_usuario\":\"1\",\"nuevo_rol\":\"administrador\"}','2025-09-24 23:37:15'),(6,4,'ACTUALIZAR',NULL,'{\"id_usuario\":\"1\",\"nuevo_rol\":\"administrador\"}','2025-09-24 23:37:57'),(7,4,'ACTUALIZAR',NULL,'{\"id_usuario\":\"1\",\"nuevo_rol\":\"administrador\"}','2025-09-24 23:41:10'),(8,4,'CREAR',6,'{\"usuario\":\"admin123@gmail.com\",\"rol\":\"administrador\"}','2025-09-24 23:45:46'),(9,4,'CREAR',7,'{\"usuario\":\"vargas@gmail.com\",\"rol\":\"administrador\"}','2025-10-03 02:22:07'),(10,4,'CREAR',8,'{\"usuario\":\"rocha@gmail.com\",\"rol\":\"usuario\"}','2025-10-03 02:24:07'),(11,6,'CREAR',9,'{\"usuario\":\"kevin123@gmail.com\",\"rol\":\"usuario\"}','2025-10-25 00:09:24'),(12,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 01:31:37'),(13,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 01:43:04'),(14,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 01:53:43'),(15,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 01:55:59'),(16,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 01:59:23'),(17,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 02:00:44'),(18,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 02:04:30'),(19,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 02:05:10'),(20,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 02:16:43'),(21,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 02:17:16'),(22,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 02:20:11'),(23,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 02:24:35'),(24,6,'CREAR',10,'{\"usuario\":\"maxi3001@gmail.com\",\"rol\":\"usuario\"}','2025-10-25 02:32:08'),(25,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 08:53:28'),(26,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 08:54:07'),(27,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 09:00:00'),(28,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 09:12:07'),(29,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 09:14:42'),(30,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 09:27:13'),(31,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 09:50:51'),(32,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 09:52:28'),(33,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 09:55:01'),(34,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 09:55:56'),(35,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 09:56:37'),(36,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 10:01:37'),(37,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 10:01:57'),(38,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 10:09:41'),(39,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"9\",\"nuevo_rol\":\"usuario\"}','2025-10-25 10:12:09'),(40,6,'ACTUALIZAR',NULL,'{\"id_usuario\":\"10\",\"nuevo_rol\":\"usuario\"}','2025-10-25 14:56:26');

#
# Structure for table "cuentas"
#

DROP TABLE IF EXISTS `cuentas`;
CREATE TABLE `cuentas` (
  `id_cuenta` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `usuario` varchar(50) NOT NULL,
  `contrasena` varchar(255) NOT NULL,
  `intentos_fallidos` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `bloqueado_hasta` datetime DEFAULT NULL,
  `ultimo_acceso` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `reset_token` varchar(100) DEFAULT NULL,
  `reset_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id_cuenta`),
  UNIQUE KEY `usuario` (`usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

#
# Data for table "cuentas"
#

INSERT INTO `cuentas` VALUES (1,'admin@gmail.com','***hash***',0,NULL,'2025-09-01 23:40:19','2025-08-14 23:56:48','2025-09-24 23:41:40',NULL,NULL),(2,'Laura','***hash***',0,NULL,'2025-08-22 02:52:17','2025-08-15 02:06:56','2025-08-22 02:52:17',NULL,NULL),(3,'cuba@gmail.com','$2b$12$wVEJUWnypMdsbjmbZEF/Rug2Tz.n2bqPPXoX3VLmH3fxrHSSUBb4G',0,NULL,'2025-09-25 00:20:50','2025-08-22 00:27:41','2025-09-25 00:20:50',NULL,NULL),(4,'countableuncountable@gmail.com','$2b$12$IZJ3qDgscgdzhTBA2Km8ruitrxrzhH8RzgI/bFeTif0rn0iAuMF/q',0,NULL,'2025-10-03 01:44:33','2025-09-02 00:15:11','2025-10-03 01:44:33',NULL,NULL),(5,'cubanaely@gmail.com','$2b$12$YZrzExyOJs6MIqAwTE56xO5wLsCYDfWXDv7tcL359xQ/K8MGbL2lG',0,NULL,'2025-09-25 00:20:20','2025-09-10 23:59:09','2025-09-25 00:20:20',NULL,NULL),(6,'admin123@gmail.com','$2b$12$DRl6NXEV2wW4l/F7jotN8.vtq0GF4AA/NWZRK4O7T0DxATU272B2y',0,NULL,'2025-10-25 14:52:53','2025-09-24 23:45:46','2025-10-25 14:52:53',NULL,NULL),(7,'vargas@gmail.com','$2b$12$SSDGNZUvYV4.leWXa8o3A.UQ5Wq20FQwGuWC9FXdZ1wv363khOMyW',0,NULL,NULL,'2025-10-03 02:22:07','2025-10-03 02:22:07',NULL,NULL),(8,'rocha@gmail.com','$2b$12$QegtQBKBoYFjSd8BTTfyOu8gBA1A1ThE1sZF7z2bvtuPdD0nS5cJu',0,NULL,NULL,'2025-10-03 02:24:07','2025-10-03 02:24:07',NULL,NULL),(9,'kevin123@gmail.com','$2b$12$IhnStMYEhlJh4etOt5hFIuaFci91y0KmqJvoMuL/IOMYF1D9L5t3a',0,NULL,'2025-10-25 08:49:22','2025-10-25 00:09:23','2025-10-25 08:49:22',NULL,NULL),(10,'maxi3001@gmail.com','$2b$12$.VxWWVmKqekjUPqFCnf.i.u1FjdnSBm2D/Yw390FOi73N1lohPVhC',0,NULL,NULL,'2025-10-25 02:32:08','2025-10-25 02:32:08',NULL,NULL);

#
# Structure for table "bitacora_accesos"
#

DROP TABLE IF EXISTS `bitacora_accesos`;
CREATE TABLE `bitacora_accesos` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `cuenta_id` smallint(5) unsigned DEFAULT NULL,
  `usuario_intento` varchar(50) DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `agente_usuario` varchar(255) DEFAULT NULL,
  `exito` tinyint(1) NOT NULL,
  `motivo` varchar(100) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `cuenta_id` (`cuenta_id`),
  CONSTRAINT `fk_bitacora_cuenta` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas` (`id_cuenta`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

#
# Data for table "bitacora_accesos"
#

INSERT INTO `bitacora_accesos` VALUES (1,1,'admin','::1','Mozilla/5.0 ...',1,'login_ok','2025-08-15 01:31:04'),(2,5,'cubanaely@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'contrasena_incorrecta','2025-09-24 23:06:49'),(3,5,'cubanaely@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'contrasena_incorrecta','2025-09-24 23:07:01'),(4,5,'cubanaely@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'contrasena_incorrecta','2025-09-24 23:07:02'),(5,3,'cuba@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'contrasena_incorrecta','2025-09-24 23:07:12'),(6,4,'countableuncountable@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'contrasena_incorrecta','2025-09-24 23:07:20'),(7,4,'countableuncountable@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'contrasena_incorrecta','2025-09-24 23:07:23'),(8,4,'countableuncountable@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'contrasena_incorrecta','2025-09-24 23:08:20'),(9,NULL,'admin@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'usuario_no_encontrado','2025-09-24 23:10:05'),(10,NULL,'admin@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'usuario_no_encontrado','2025-09-24 23:10:07'),(11,NULL,'admin@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'usuario_no_encontrado','2025-09-24 23:10:08'),(12,NULL,'admin@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'usuario_no_encontrado','2025-09-24 23:10:59'),(13,NULL,'admin@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'usuario_no_encontrado','2025-09-24 23:11:00'),(14,4,'countableuncountable@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'contrasena_incorrecta','2025-09-24 23:11:37'),(15,4,'countableuncountable@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',1,'login_ok','2025-09-24 23:30:01'),(16,5,'cubanaely@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'contrasena_incorrecta','2025-09-24 23:49:27'),(17,5,'cubanaely@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',1,'login_ok','2025-09-24 23:50:31'),(18,3,'cuba@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',1,'login_ok','2025-09-25 00:18:16'),(19,5,'cubanaely@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',1,'login_ok','2025-09-25 00:20:20'),(20,3,'cuba@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',0,'contrasena_incorrecta','2025-09-25 00:20:38'),(21,3,'cuba@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',1,'login_ok','2025-09-25 00:20:50'),(22,4,'countableuncountable@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',1,'login_ok','2025-10-02 23:38:11'),(23,NULL,'lenny@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',0,'usuario_no_encontrado','2025-10-03 01:44:24'),(24,4,'countableuncountable@gmail.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',1,'login_ok','2025-10-03 01:44:33'),(25,NULL,'kevin123@gmail.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',0,'usuario_no_encontrado','2025-10-25 00:06:40'),(26,6,'admin123@gmail.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',1,'login_ok','2025-10-25 00:06:51'),(27,9,'kevin123@gmail.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',1,'login_ok','2025-10-25 00:13:59'),(28,6,'admin123@gmail.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',1,'login_ok','2025-10-25 08:49:04'),(29,9,'kevin123@gmail.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',1,'login_ok','2025-10-25 08:49:22'),(30,6,'admin123@gmail.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',1,'login_ok','2025-10-25 14:52:53');

#
# Structure for table "roles"
#

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id_rol` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(30) NOT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nombre_rol` (`nombre_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

#
# Data for table "roles"
#

INSERT INTO `roles` VALUES (1,'administrador'),(2,'usuario');

#
# Structure for table "usuarios"
#

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id_usuario` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `cuenta_id` smallint(5) unsigned NOT NULL,
  `rol_id` smallint(5) unsigned NOT NULL,
  `nombres` varchar(60) DEFAULT NULL,
  `primer_apellido` varchar(60) DEFAULT NULL,
  `segundo_apellido` varchar(60) DEFAULT NULL,
  `ci` varchar(20) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `telefono` varchar(25) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `email` varchar(120) DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  KEY `rol_id` (`rol_id`),
  KEY `cuenta_id` (`cuenta_id`),
  CONSTRAINT `fk_usuario_cuenta` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas` (`id_cuenta`) ON UPDATE CASCADE,
  CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id_rol`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

#
# Data for table "usuarios"
#

INSERT INTO `usuarios` VALUES (1,1,1,'ADMIN','SISTEMA','SISTEMA','123456','2004-12-29','78945612','CALLE LOPEZ','2025-08-14 23:56:48','2025-09-24 23:41:10',NULL),(2,2,2,'Laura','Cuba','Luna','123456','2000-03-27','70706162','Av. Heroinas','2025-08-15 02:06:56','2025-08-21 23:18:44','laura@demo.com'),(3,3,1,'LAURA','LUNA','VARGAS','9874561','2000-03-27','70601820','AV. SAN MARTIN','2025-08-22 00:27:41','2025-08-22 00:27:41',NULL),(4,4,1,'LAURA','CUBA','LUNA','9412345','1999-12-31','72641958','AV. PIRAI','2025-09-02 00:15:11','2025-09-02 00:15:11','countableuncountable@gmail.com'),(5,5,2,'NAELY','CUBA','LUNA','9712358','2000-06-30','72948562','AV. SIMON LOPEZ','2025-09-10 23:59:09','2025-09-10 23:59:09','cubanaely@gmail.com'),(6,6,1,'KEVIN','SOTO','EFFEN','123456','1989-12-31','70605040','AV. COLQUIRI','2025-09-24 23:45:46','2025-09-24 23:45:46','admin123@gmail.com'),(7,7,1,'LENNY','VARGAS',NULL,'85632441','2024-12-30','2487963','AV. VALLE DEL SUR','2025-10-03 02:22:07','2025-10-03 02:22:07','vargas@gmail.com'),(8,8,2,'RICARDO','VILLANUEVA',NULL,'789663','2024-05-26','68933324','CALLE SIMON LOPEZ','2025-10-03 02:24:07','2025-10-03 02:24:07','rocha@gmail.com'),(9,9,2,'KEVIN SERGIO','SOTO','EFFEN','8674564','1995-10-08','12345678','AV','2025-10-25 00:09:23','2025-10-25 10:12:09',NULL),(10,10,2,'MAXIMILANO','GUTIERREZ',NULL,'5678964','2000-01-29','78945612','AV AMERICA','2025-10-25 02:32:08','2025-10-25 14:56:26',NULL);

#
# Structure for table "lecturas_resumen"
#

DROP TABLE IF EXISTS `lecturas_resumen`;
CREATE TABLE `lecturas_resumen` (
  `id_lectura` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` smallint(5) unsigned NOT NULL,
  `voltaje` decimal(10,2) DEFAULT NULL,
  `bateria` decimal(5,2) DEFAULT NULL,
  `consumo` decimal(12,2) DEFAULT NULL,
  `fecha_lectura` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_lectura`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fk_resumen_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

#
# Data for table "lecturas_resumen"
#


#
# Structure for table "eolicos"
#

DROP TABLE IF EXISTS `eolicos`;
CREATE TABLE `eolicos` (
  `id_eolico` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 0,
  `usuario_id` smallint(5) unsigned DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `habilitado` tinyint(1) NOT NULL DEFAULT 0,
  `tarifa_mes` decimal(10,2) NOT NULL DEFAULT 0.00,
  `costo_instalacion` decimal(10,2) NOT NULL DEFAULT 0.00,
  `deposito` decimal(10,2) NOT NULL DEFAULT 0.00,
  `costo_operativo_dia` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id_eolico`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fk_eolico_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

#
# Data for table "eolicos"
#

INSERT INTO `eolicos` VALUES (1,'0001',1,2,'2025-09-10 23:51:05',1,10.00,20.00,30.00,20.00),(2,'0002',1,5,'2025-09-10 23:52:40',1,5.00,30.00,10.00,10.00),(4,'0003',1,4,'2025-09-24 00:50:00',1,10.00,45.00,25.00,10.00),(5,'0004',1,9,'2025-10-25 00:09:53',1,150.00,300.00,0.00,0.00);

#
# Structure for table "alquileres"
#

DROP TABLE IF EXISTS `alquileres`;
CREATE TABLE `alquileres` (
  `id_alquiler` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `eolico_id` smallint(5) unsigned NOT NULL,
  `usuario_id` smallint(5) unsigned NOT NULL,
  `fecha_inicio` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_fin` datetime DEFAULT NULL,
  `estado` enum('activo','finalizado') NOT NULL DEFAULT 'activo',
  `tarifa_mes` decimal(10,2) NOT NULL DEFAULT 0.00,
  `costo_instalacion` decimal(10,2) NOT NULL DEFAULT 0.00,
  `deposito` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id_alquiler`),
  KEY `eolico_id` (`eolico_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fk_alq_eolico` FOREIGN KEY (`eolico_id`) REFERENCES `eolicos` (`id_eolico`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_alq_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

#
# Data for table "alquileres"
#

INSERT INTO `alquileres` VALUES (1,1,2,'2025-09-10 23:51:30',NULL,'activo',0.00,0.00,0.00),(2,2,5,'2025-09-24 00:08:02',NULL,'activo',0.00,0.00,0.00),(3,4,4,'2025-09-24 00:50:13',NULL,'activo',15.00,35.00,25.00),(4,5,9,'2025-10-25 00:10:27',NULL,'activo',150.00,300.00,0.00);

#
# Structure for table "cuotas"
#

DROP TABLE IF EXISTS `cuotas`;
CREATE TABLE `cuotas` (
  `id_cuota` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `alquiler_id` smallint(5) unsigned NOT NULL,
  `concepto` enum('tarifa','instalacion','deposito','operativo','otro') NOT NULL,
  `numero` smallint(5) unsigned NOT NULL,
  `descripcion` varchar(120) DEFAULT NULL,
  `fecha_vencimiento` date NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `pagado` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_pago` datetime DEFAULT NULL,
  `metodo_pago` varchar(40) DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_cuota`),
  UNIQUE KEY `uq_alq_concepto_numero` (`alquiler_id`,`concepto`,`numero`),
  KEY `alquiler_id` (`alquiler_id`),
  CONSTRAINT `fk_cuota_alquiler` FOREIGN KEY (`alquiler_id`) REFERENCES `alquileres` (`id_alquiler`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

#
# Data for table "cuotas"
#

INSERT INTO `cuotas` VALUES (1,1,'tarifa',1,'Tarifa mensual 1/6 (0001)','2025-10-03',8.33,1,'2025-10-03 00:33:17','efectivo','Caja','2025-10-03 00:33:00'),(2,1,'tarifa',2,'Tarifa mensual 2/6 (0001)','2025-11-03',8.33,0,NULL,NULL,NULL,'2025-10-03 00:33:00'),(3,1,'tarifa',3,'Tarifa mensual 3/6 (0001)','2025-12-03',8.33,0,NULL,NULL,NULL,'2025-10-03 00:33:00'),(4,1,'tarifa',4,'Tarifa mensual 4/6 (0001)','2026-01-03',8.33,0,NULL,NULL,NULL,'2025-10-03 00:33:00'),(5,1,'tarifa',5,'Tarifa mensual 5/6 (0001)','2026-02-03',8.33,0,NULL,NULL,NULL,'2025-10-03 00:33:00'),(6,1,'tarifa',6,'Tarifa mensual 6/6 (0001)','2026-03-03',8.35,0,NULL,NULL,NULL,'2025-10-03 00:33:00'),(7,2,'tarifa',1,'Tarifa mensual 1/4 (0002)','2025-10-03',126.25,0,NULL,NULL,NULL,'2025-10-03 02:25:43'),(8,2,'tarifa',2,'Tarifa mensual 2/4 (0002)','2025-11-03',126.25,0,NULL,NULL,NULL,'2025-10-03 02:25:43'),(9,2,'tarifa',3,'Tarifa mensual 3/4 (0002)','2025-12-03',126.25,0,NULL,NULL,NULL,'2025-10-03 02:25:43'),(10,2,'tarifa',4,'Tarifa mensual 4/4 (0002)','2026-01-03',126.25,0,NULL,NULL,NULL,'2025-10-03 02:25:43'),(11,3,'tarifa',1,'Tarifa mensual 1/3 (0003)','2025-08-01',15.00,1,'2025-10-03 04:10:43','efectivo','Caja','2025-10-03 04:10:29'),(12,3,'tarifa',2,'Tarifa mensual 2/3 (0003)','2025-09-01',15.00,1,'2025-10-03 04:10:45','efectivo','Caja','2025-10-03 04:10:29'),(13,3,'tarifa',3,'Tarifa mensual 3/3 (0003)','2025-10-02',15.00,1,'2025-10-03 04:10:46','efectivo','Caja','2025-10-03 04:10:29'),(14,4,'instalacion',1,'Instalación (Bs 300.00) + Primer mes (Bs 150.00)','2025-11-01',450.00,0,NULL,NULL,NULL,'2025-10-25 00:10:27'),(15,4,'tarifa',1,'Alquiler mensual del sistema eólico','2025-11-25',150.00,0,NULL,NULL,NULL,'2025-10-25 00:10:27'),(16,4,'tarifa',2,'Alquiler mensual del sistema eólico','2025-12-25',150.00,0,NULL,NULL,NULL,'2025-10-25 00:10:27'),(17,4,'tarifa',3,'Alquiler mensual del sistema eólico','2026-01-25',150.00,0,NULL,NULL,NULL,'2025-10-25 00:10:27'),(18,4,'tarifa',4,'Alquiler mensual del sistema eólico','2026-02-25',150.00,0,NULL,NULL,NULL,'2025-10-25 00:10:27'),(19,4,'tarifa',5,'Alquiler mensual del sistema eólico','2026-03-25',150.00,0,NULL,NULL,NULL,'2025-10-25 00:10:27'),(20,4,'tarifa',6,'Alquiler mensual del sistema eólico','2026-04-25',150.00,0,NULL,NULL,NULL,'2025-10-25 00:10:27'),(21,4,'tarifa',7,'Alquiler mensual del sistema eólico','2026-05-25',150.00,0,NULL,NULL,NULL,'2025-10-25 00:10:27'),(22,4,'tarifa',8,'Alquiler mensual del sistema eólico','2026-06-25',150.00,0,NULL,NULL,NULL,'2025-10-25 00:10:27'),(23,4,'tarifa',9,'Alquiler mensual del sistema eólico','2026-07-25',150.00,0,NULL,NULL,NULL,'2025-10-25 00:10:27'),(24,4,'tarifa',10,'Alquiler mensual del sistema eólico','2026-08-25',150.00,0,NULL,NULL,NULL,'2025-10-25 00:10:27'),(25,4,'tarifa',11,'Alquiler mensual del sistema eólico','2026-09-25',150.00,0,NULL,NULL,NULL,'2025-10-25 00:10:27'),(26,4,'tarifa',12,'Alquiler mensual del sistema eólico','2026-10-25',150.00,1,'2025-10-25 00:10:48','efectivo','Pago registrado desde módulo de alquileres','2025-10-25 00:10:27');

#
# Structure for table "ventanas_energia"
#

DROP TABLE IF EXISTS `ventanas_energia`;
CREATE TABLE `ventanas_energia` (
  `id_ventana` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` smallint(5) unsigned NOT NULL,
  `hora` time DEFAULT NULL,
  `valor` decimal(10,2) DEFAULT NULL,
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_ventana`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fk_ventana_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

#
# Data for table "ventanas_energia"
#

