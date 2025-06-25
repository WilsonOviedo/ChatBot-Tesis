# ChatBot Universitario

Un chatbot interactivo para estudiantes que responde preguntas sobre temas administrativos de la universidad.

## Requisitos Previos

- [Node.js](https://nodejs.org/) (versión 14 o superior)
- [Ollama](https://ollama.ai/) instalado y configurado
  - Modelo requerido: `gemma:3b`
  - Para instalar el modelo: `ollama pull gemma:3b`
- Navegador web moderno (Chrome, Firefox, Edge, etc.)

## Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd ChatBot-Tesis
```

2. Instalar las dependencias:
```bash
npm install
```

3. Asegurarse de que Ollama esté instalado y ejecutándose:
   - En Windows: Ejecutar Ollama desde el menú inicio
   - En Linux/Mac: Ejecutar `ollama serve` en una terminal

4. Instalar el modelo de Ollama:
```bash
ollama pull gemma:3b
```

5. Verificar que Ollama esté corriendo en el puerto 11434 (puerto por defecto)

## Configuración

1. Crear la carpeta `data` en la raíz del proyecto:
```bash
mkdir data
```

2. Crear la carpeta `pdfs` para almacenar archivos PDF:
```bash
mkdir pdfs
```

## Ejecución

1. Iniciar el servidor:
```bash
node server.js
```

2. Acceder a las interfaces:
   - Chat: http://localhost:3000/index.html
   - Administración: http://localhost:3000/admin.html
     - Contraseña por defecto: admin123

## Estructura del Proyecto

```
ChatBot-Tesis/
├── data/
│   └── qa.json           # Base de conocimiento del chatbot
├── pdfs/                 # Archivos PDF para descarga
│   └── README.md         # Documentación de PDFs
├── index.html            # Interfaz del chat
├── styles.css            # Estilos del chat
├── script.js             # Lógica del chat
├── admin.html            # Interfaz de administración
├── admin.css             # Estilos de administración
├── admin.js              # Lógica de administración
├── server.js             # Servidor Node.js
└── package.json          # Dependencias del proyecto
```

## Puertos Utilizados

- **3000**: Servidor web (chat y administración)
- **11434**: Ollama (API de lenguaje)

## Características

- Interfaz de chat intuitiva
- Panel de administración para gestionar preguntas y respuestas
- **Gestión de PDFs**: Subir, eliminar y gestionar archivos PDF
- **Enlaces de descarga**: Insertar enlaces de PDF en las respuestas del bot
- Formateo de texto (negrita, cursiva, saltos de línea)
- Búsqueda de preguntas y respuestas
- Autenticación para editar el prompt del sistema
- Almacenamiento persistente de datos

## Gestión de PDFs

### Subir PDFs
1. Accede al panel de administración
2. Ve a la sección "Gestión de PDFs"
3. Selecciona un archivo PDF y haz clic en "Subir PDF"

### Insertar enlaces de PDF en respuestas
1. Al editar una pregunta y respuesta, usa el botón "Insertar PDF"
2. Ingresa el nombre del archivo PDF (ej: `programa_informatica.pdf`)
3. Ingresa el texto del enlace (ej: "Descargar Programa")
4. El enlace se insertará con el formato: `[Descargar Programa](pdf:programa_informatica.pdf)`

### En el chat
- Los usuarios verán botones rojos de descarga cuando el bot responda con enlaces de PDF
- Los botones incluyen un ícono 📄 y el texto del enlace
- Al hacer clic, se descargará automáticamente el archivo PDF

## Seguridad

- El archivo `data/qa.json` contiene información sensible y no debe ser compartido
- La interfaz de administración está protegida por contraseña
- Se recomienda cambiar la contraseña por defecto (admin123)
- Solo se permiten archivos PDF en la subida de archivos

## Solución de Problemas

1. Si el servidor no inicia:
   - Verificar que el puerto 3000 no esté en uso
   - Asegurarse de que Node.js esté instalado correctamente

2. Si Ollama no responde:
   - Verificar que Ollama esté ejecutándose
   - Comprobar que el puerto 11434 esté disponible
   - Reiniciar el servicio de Ollama

3. Si la interfaz no carga:
   - Limpiar la caché del navegador
   - Verificar que el servidor esté corriendo
   - Comprobar la consola del navegador para errores

4. Si los PDFs no se suben:
   - Verificar que la carpeta `pdfs` exista
   - Comprobar que el archivo sea un PDF válido
   - Revisar los permisos de escritura en la carpeta

## Contribución

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.
