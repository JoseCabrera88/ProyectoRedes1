# Proyecto Final: Simulador de Protocolo de Comunicación entre Computadoras

## Descripción
Este proyecto es un simulador de protocolo de comunicación que permite la transmisión 
de datos entre computadoras reales a través de Internet. Muestra el proceso de transmisión 
a través de un modelo OSI simplificado con comunicación en tiempo real.

## Características
-  Comunicación real entre computadoras a través de Internet
-  Sistema de salas para conectar computadoras específicas
-  Transmisión de texto, imágenes y videos
-  Simulación del modelo OSI de 7 capas
-  Protocolos TCP y UDP simulados
-  Visualización en tiempo real del proceso
-  Interfaz moderna y responsive

## Estructura del Proyecto

proyecto-final-redes/
│
├── server.js # Servidor Node.js + Socket.io
├── package.json # Dependencias del proyecto
├── public/
│ ├── index.html # Cliente principal
│ ├── styles.css # Estilos
│ └── script.js # Lógica del cliente
└── README.md # Documentación


## Instalación y Ejecución

### Prerrequisitos
- Node.js (versión 14 o superior)
- Navegador web moderno

### Pasos para ejecutar

1. **Instalar dependencias:**
   ```bash
   npm install

2. **Iniciar el servidor:**
   ```bash
   npm start

3. **Acceder a la aplicación:**

- Abrir navegador web
- Ir a: http://localhost:3000
- Para conectar otra computadora: usar la IP del servidor (ej: http://192.168.1.100:3000)

## Instrucciones de Uso
1. Configurar el Servidor
- Ejecutar npm start en la computadora que hará de servidor
- Anotar la IP y puerto (ej: http://192.168.1.100:3000)

2. Conectar Computadoras

Computadora 1:
- Acceder a la URL del servidor
- Crear nueva sala
- Ingresar nombre (ej: "PC-Lab1")
- Anotar el código de sala generado

Computadora 2:
- Acceder a la misma URL del servidor
- Unirse a sala existente
- Ingresar nombre (ej: "Laptop-Maria")
- Ingresar el código de sala

3. Realizar Transmisión
    1. Configurar envío:

- Seleccionar tipo de datos (Texto/Imagen/Video)
- Ingresar texto o seleccionar archivo
- Elegir protocolo (TCP/UDP)
- Seleccionar computadora destino

    2. Iniciar transmisión:

- Hacer clic en "Transmitir Datos"
- Observar el proceso en tiempo real
- Ver logs detallados

    3. Ver resultados:

- La computadora receptora verá los datos recibidos
- Logs completos del proceso

Tecnologías Utilizadas
Backend: Node.js, Express, Socket.io

Frontend: HTML5, CSS3, JavaScript ES6+

Comunicación: WebSockets (Socket.io)

Almacenamiento: Map (en memoria)
