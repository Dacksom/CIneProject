// Configuración para CinePay - Integración con Rapikom y CinesUnidos
const CinePayConfig = {
    // Configuración de Rapikom
    rapikom: {
        apiKey: process.env.RAPIKOM_API_KEY || 'YOUR_RAPIKOM_API_KEY',
        endpoint: process.env.RAPIKOM_ENDPOINT || 'https://api.rapikom.com/v1',
        merchantId: process.env.RAPIKOM_MERCHANT_ID || 'CINESUNIDOS_001',
        environment: process.env.NODE_ENV || 'development', // development, staging, production
        timeout: 30000, // 30 segundos
        retryAttempts: 3
    },

    // Configuración de CinesUnidos
    cinesUnidos: {
        apiEndpoint: process.env.CINESUNIDOS_API || 'https://api.cinesunidos.com/v1',
        apiKey: process.env.CINESUNIDOS_API_KEY || 'YOUR_CINESUNIDOS_API_KEY',
        cinemaId: process.env.CINEMA_ID || 'CINE_001',
        syncInterval: 300000, // 5 minutos
        maxRetries: 3
    },

    // Configuración de la aplicación
    app: {
        name: 'CinePay',
        version: '1.0.0',
        currency: 'USD',
        language: 'es',
        timezone: 'America/Caracas',
        debug: process.env.NODE_ENV === 'development'
    },

    // Configuración de pagos
    payment: {
        supportedMethods: ['credit_card', 'debit_card', 'mobile_payment'],
        currencies: ['USD', 'VES'],
        taxRate: 0.16, // 16% IVA
        serviceFee: 0.50, // $0.50 por transacción
        maxAmount: 1000.00,
        minAmount: 1.00
    },

    // Configuración de seguridad
    security: {
        cardEncryption: true,
        sslRequired: true,
        sessionTimeout: 1800000, // 30 minutos
        maxLoginAttempts: 5,
        passwordMinLength: 8
    },

    // Configuración de notificaciones
    notifications: {
        email: {
            enabled: true,
            provider: 'smtp',
            from: 'noreply@cinepay.com'
        },
        sms: {
            enabled: false,
            provider: 'twilio'
        },
        push: {
            enabled: true,
            provider: 'firebase'
        }
    },

    // Configuración de base de datos
    database: {
        type: 'postgresql',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'cinepay',
        user: process.env.DB_USER || 'cinepay_user',
        password: process.env.DB_PASSWORD || 'secure_password'
    },

    // Configuración de logs
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: 'logs/cinepay.log',
        maxSize: '10m',
        maxFiles: 5
    }
};

// Configuración específica para diferentes entornos
const EnvironmentConfig = {
    development: {
        ...CinePayConfig,
        rapikom: {
            ...CinePayConfig.rapikom,
            endpoint: 'https://sandbox-api.rapikom.com/v1',
            environment: 'sandbox'
        },
        app: {
            ...CinePayConfig.app,
            debug: true
        }
    },

    staging: {
        ...CinePayConfig,
        rapikom: {
            ...CinePayConfig.rapikom,
            endpoint: 'https://staging-api.rapikom.com/v1',
            environment: 'staging'
        }
    },

    production: {
        ...CinePayConfig,
        rapikom: {
            ...CinePayConfig.rapikom,
            endpoint: 'https://api.rapikom.com/v1',
            environment: 'production'
        },
        app: {
            ...CinePayConfig.app,
            debug: false
        },
        security: {
            ...CinePayConfig.security,
            sslRequired: true
        }
    }
};

// Función para obtener la configuración según el entorno
function getConfig() {
    const env = process.env.NODE_ENV || 'development';
    return EnvironmentConfig[env] || EnvironmentConfig.development;
}

// Función para validar la configuración
function validateConfig(config) {
    const required = [
        'rapikom.apiKey',
        'rapikom.merchantId',
        'cinesUnidos.apiKey',
        'cinesUnidos.cinemaId'
    ];

    const missing = required.filter(key => {
        const value = key.split('.').reduce((obj, k) => obj && obj[k], config);
        return !value || value === 'YOUR_RAPIKOM_API_KEY' || value === 'YOUR_CINESUNIDOS_API_KEY';
    });

    if (missing.length > 0) {
        console.warn('⚠️  Configuración incompleta. Faltan las siguientes variables:', missing);
        return false;
    }

    return true;
}

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CinePayConfig,
        EnvironmentConfig,
        getConfig,
        validateConfig
    };
} else {
    window.CinePayConfig = {
        CinePayConfig,
        EnvironmentConfig,
        getConfig,
        validateConfig
    };
}
