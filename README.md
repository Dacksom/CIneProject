# CinePay - Pasarela de Pago para CinesUnidos

Una pasarela de pagos moderna y fluida diseñada específicamente para CinesUnidos con integración completa con Rapikom.

## 🎬 Características

- **Interfaz moderna y responsiva** - Diseño elegante con animaciones fluidas
- **Integración con Rapikom** - Procesamiento de pagos seguro y confiable
- **Sincronización con CinesUnidos** - Gestión automática de reservas
- **Validación en tiempo real** - Verificación de datos de pago
- **Múltiples métodos de pago** - Tarjetas de crédito, débito y pagos móviles
- **Notificaciones inteligentes** - Sistema de alertas en tiempo real
- **Códigos QR** - Para entrada rápida al cine
- **Responsive Design** - Optimizado para móviles y tablets

## 🚀 Instalación

### Requisitos Previos

- Node.js 16+ (opcional, para desarrollo)
- Servidor web (Apache, Nginx, etc.)
- Cuenta de Rapikom
- Acceso a API de CinesUnidos

### Instalación Rápida

1. **Clonar o descargar el proyecto**
```bash
git clone https://github.com/tu-usuario/cine-payment-gateway.git
cd cine-payment-gateway
```

2. **Configurar variables de entorno**
```bash
# Crear archivo .env
cp .env.example .env

# Editar variables de entorno
RAPIKOM_API_KEY=tu_api_key_de_rapikom
RAPIKOM_MERCHANT_ID=tu_merchant_id
CINESUNIDOS_API_KEY=tu_api_key_de_cinesunidos
CINEMA_ID=tu_cinema_id
```

3. **Configurar el servidor web**
```bash
# Para Apache
cp -r * /var/www/html/cinepay/

# Para Nginx
cp -r * /usr/share/nginx/html/cinepay/
```

## ⚙️ Configuración

### Configuración de Rapikom

1. **Obtener credenciales de Rapikom**
   - Registrarse en [Rapikom](https://rapikom.com)
   - Obtener API Key y Merchant ID
   - Configurar webhooks

2. **Configurar webhooks**
```javascript
// URL del webhook: https://tu-dominio.com/webhook/rapikom
// Eventos: payment.succeeded, payment.failed, payment.refunded
```

### Configuración de CinesUnidos

1. **Configurar API de CinesUnidos**
   - Obtener API Key de CinesUnidos
   - Configurar endpoints de sincronización
   - Establecer intervalos de actualización

2. **Configurar sincronización**
```javascript
// Sincronización automática cada 5 minutos
syncInterval: 300000
```

### Variables de Entorno

```bash
# Rapikom Configuration
RAPIKOM_API_KEY=sk_test_...
RAPIKOM_ENDPOINT=https://api.rapikom.com/v1
RAPIKOM_MERCHANT_ID=CINESUNIDOS_001

# CinesUnidos Configuration
CINESUNIDOS_API=https://api.cinesunidos.com/v1
CINESUNIDOS_API_KEY=your_cinesunidos_api_key
CINEMA_ID=CINE_001

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cinepay
DB_USER=cinepay_user
DB_PASSWORD=secure_password

# App Configuration
NODE_ENV=production
LOG_LEVEL=info
```

## 🎯 Uso

### Flujo de Pago

1. **Selección de Película**
   - Usuario selecciona una película del catálogo
   - Se muestra información detallada y precio

2. **Selección de Asientos**
   - Visualización del mapa de asientos
   - Selección múltiple de asientos
   - Validación de disponibilidad

3. **Información de Pago**
   - Formulario seguro de datos de tarjeta
   - Validación en tiempo real
   - Cálculo automático de totales

4. **Confirmación**
   - Procesamiento del pago con Rapikom
   - Generación de código QR
   - Envío de confirmación por email

### API Endpoints

#### Procesar Pago
```javascript
POST /api/payment/process
{
  "movie_id": "avengers",
  "seats": ["A1", "A2"],
  "payment_method": {
    "card_number": "4111111111111111",
    "expiry": "12/25",
    "cvv": "123",
    "card_name": "Juan Pérez"
  },
  "customer": {
    "email": "juan@ejemplo.com"
  }
}
```

#### Verificar Transacción
```javascript
GET /api/payment/status/{transaction_id}
```

#### Obtener Historial
```javascript
GET /api/payment/history?date_from=2024-01-01&date_to=2024-12-31
```

## 🔧 Desarrollo

### Estructura del Proyecto

```
cine-payment-gateway/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── script.js           # Lógica principal
├── config.js           # Configuración
├── rapikom-integration.js  # Integración con Rapikom
├── cinesunidos-api.js      # API de CinesUnidos
├── webhook-handler.js      # Manejo de webhooks
├── package.json        # Dependencias (si aplica)
└── README.md          # Documentación
```

### Scripts de Desarrollo

```bash
# Instalar dependencias (si aplica)
npm install

# Servidor de desarrollo
npm run dev

# Construir para producción
npm run build

# Ejecutar tests
npm test
```

### Personalización

#### Cambiar Colores
```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --success-color: #4CAF50;
  --error-color: #f44336;
}
```

#### Agregar Nuevas Películas
```javascript
// En script.js
this.moviePrices = {
    'avengers': 12.50,
    'spiderman': 11.00,
    'batman': 13.00,
    'nueva-pelicula': 15.00  // Agregar aquí
};
```

#### Configurar Nuevos Métodos de Pago
```javascript
// En config.js
payment: {
    supportedMethods: ['credit_card', 'debit_card', 'mobile_payment', 'crypto']
}
```

## 🔒 Seguridad

### Mejores Prácticas

1. **Encriptación de Datos**
   - Todos los datos de tarjetas se encriptan
   - Uso de HTTPS obligatorio
   - Validación de certificados SSL

2. **Validación de Entrada**
   - Sanitización de datos
   - Validación de tipos
   - Prevención de XSS

3. **Autenticación**
   - Tokens JWT para sesiones
   - Rate limiting
   - Logs de auditoría

### Configuración de Seguridad

```javascript
security: {
    cardEncryption: true,
    sslRequired: true,
    sessionTimeout: 1800000,
    maxLoginAttempts: 5,
    passwordMinLength: 8
}
```

## 📊 Monitoreo

### Logs

```bash
# Ver logs en tiempo real
tail -f logs/cinepay.log

# Buscar errores
grep "ERROR" logs/cinepay.log

# Estadísticas de transacciones
grep "payment.succeeded" logs/cinepay.log | wc -l
```

### Métricas

- Tasa de conversión de pagos
- Tiempo promedio de procesamiento
- Errores por método de pago
- Uso de recursos del servidor

## 🚨 Troubleshooting

### Problemas Comunes

1. **Error de conexión con Rapikom**
   - Verificar API Key
   - Comprobar conectividad de red
   - Revisar logs de error

2. **Pagos fallidos**
   - Validar datos de tarjeta
   - Verificar límites de transacción
   - Revisar configuración de comercio

3. **Sincronización con CinesUnidos**
   - Verificar API Key de CinesUnidos
   - Comprobar endpoints
   - Revisar intervalos de sincronización

### Logs de Debug

```javascript
// Habilitar logs de debug
config.app.debug = true;
```

## 📞 Soporte

### Contacto

- **Email**: soporte@cinepay.com
- **Teléfono**: +58 212-555-0123
- **Documentación**: https://docs.cinepay.com

### Recursos Adicionales

- [Documentación de Rapikom](https://docs.rapikom.com)
- [API de CinesUnidos](https://api.cinesunidos.com/docs)
- [Guía de Integración](https://cinepay.com/integration-guide)

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 🏆 Créditos

Desarrollado por el equipo de CinePay para CinesUnidos.

---

**CinePay v1.0.0** - Haciendo el cine más accesible, un pago a la vez. 🎬
