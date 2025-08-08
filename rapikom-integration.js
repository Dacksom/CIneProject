// Integración con Rapikom para CinePay
class RapikomIntegration {
    constructor(config) {
        this.config = config;
        this.baseUrl = config.rapikom.endpoint;
        this.apiKey = config.rapikom.apiKey;
        this.merchantId = config.rapikom.merchantId;
        this.environment = config.rapikom.environment;
    }

    // Generar headers para las peticiones a Rapikom
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Merchant-ID': this.merchantId,
            'X-Environment': this.environment,
            'User-Agent': 'CinePay/1.0.0'
        };
    }

    // Realizar petición HTTP a Rapikom
    async makeRequest(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: this.getHeaders(),
            timeout: this.config.rapikom.timeout
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(`Rapikom API Error: ${result.message || response.statusText}`);
            }

            return result;
        } catch (error) {
            console.error('Rapikom API Error:', error);
            throw error;
        }
    }

    // Crear una transacción de pago
    async createPayment(paymentData) {
        const payload = {
            amount: paymentData.amount,
            currency: paymentData.currency || 'USD',
            description: `Compra de boletos - ${paymentData.movie.title}`,
            customer: {
                email: paymentData.customer.email,
                name: paymentData.paymentMethod.cardName
            },
            payment_method: {
                type: 'card',
                card_number: this.encryptCardNumber(paymentData.paymentMethod.cardNumber),
                expiry_month: paymentData.paymentMethod.expiry.split('/')[0],
                expiry_year: '20' + paymentData.paymentMethod.expiry.split('/')[1],
                cvv: paymentData.paymentMethod.cvv
            },
            metadata: {
                movie_id: paymentData.movie.id,
                movie_title: paymentData.movie.title,
                seats: paymentData.seats,
                cinema_id: this.config.cinesUnidos.cinemaId,
                service: 'cinepay'
            },
            callback_url: `${window.location.origin}/payment/callback`,
            success_url: `${window.location.origin}/payment/success`,
            cancel_url: `${window.location.origin}/payment/cancel`
        };

        return await this.makeRequest('/payments', 'POST', payload);
    }

    // Verificar el estado de una transacción
    async getTransactionStatus(transactionId) {
        return await this.makeRequest(`/payments/${transactionId}`);
    }

    // Reembolsar una transacción
    async refundTransaction(transactionId, amount = null, reason = 'Customer request') {
        const payload = {
            amount: amount,
            reason: reason
        };

        return await this.makeRequest(`/payments/${transactionId}/refund`, 'POST', payload);
    }

    // Obtener historial de transacciones
    async getTransactionHistory(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = `/payments${queryParams ? `?${queryParams}` : ''}`;
        return await this.makeRequest(endpoint);
    }

    // Validar tarjeta de crédito
    async validateCard(cardData) {
        const payload = {
            card_number: this.encryptCardNumber(cardData.cardNumber),
            expiry_month: cardData.expiry.split('/')[0],
            expiry_year: '20' + cardData.expiry.split('/')[1],
            cvv: cardData.cvv
        };

        return await this.makeRequest('/cards/validate', 'POST', payload);
    }

    // Encriptar número de tarjeta (simulación)
    encryptCardNumber(cardNumber) {
        // En producción, usar una librería de encriptación real
        // Por ahora, solo ocultamos los números del medio
        if (cardNumber.length >= 4) {
            const firstFour = cardNumber.substring(0, 4);
            const lastFour = cardNumber.substring(cardNumber.length - 4);
            return `${firstFour}****${lastFour}`;
        }
        return cardNumber;
    }

    // Procesar webhook de Rapikom
    async processWebhook(webhookData) {
        const { event_type, data } = webhookData;

        switch (event_type) {
            case 'payment.succeeded':
                return await this.handlePaymentSuccess(data);
            case 'payment.failed':
                return await this.handlePaymentFailure(data);
            case 'payment.refunded':
                return await this.handlePaymentRefund(data);
            default:
                console.log(`Webhook no manejado: ${event_type}`);
                return { success: true };
        }
    }

    // Manejar pago exitoso
    async handlePaymentSuccess(data) {
        console.log('Pago exitoso:', data);
        
        // Aquí se integraría con CinesUnidos para confirmar la reserva
        const reservationData = {
            transaction_id: data.id,
            movie_id: data.metadata.movie_id,
            seats: data.metadata.seats,
            customer_email: data.customer.email,
            amount: data.amount,
            status: 'confirmed'
        };

        // Simular integración con CinesUnidos
        await this.updateCinesUnidosReservation(reservationData);

        return {
            success: true,
            message: 'Pago procesado exitosamente',
            reservation_code: this.generateReservationCode(data.id)
        };
    }

    // Manejar pago fallido
    async handlePaymentFailure(data) {
        console.log('Pago fallido:', data);
        
        return {
            success: false,
            message: 'El pago no pudo ser procesado',
            error_code: data.failure_code,
            error_message: data.failure_message
        };
    }

    // Manejar reembolso
    async handlePaymentRefund(data) {
        console.log('Reembolso procesado:', data);
        
        // Actualizar estado en CinesUnidos
        await this.updateCinesUnidosReservation({
            transaction_id: data.payment_id,
            status: 'refunded'
        });

        return {
            success: true,
            message: 'Reembolso procesado exitosamente'
        };
    }

    // Actualizar reserva en CinesUnidos
    async updateCinesUnidosReservation(reservationData) {
        // Simular llamada a API de CinesUnidos
        console.log('Actualizando reserva en CinesUnidos:', reservationData);
        
        // En producción, aquí se haría la llamada real a la API de CinesUnidos
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true });
            }, 1000);
        });
    }

    // Generar código de reserva
    generateReservationCode(transactionId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `CINE-${timestamp}-${random}`.toUpperCase();
    }

    // Obtener métodos de pago disponibles
    async getPaymentMethods() {
        return await this.makeRequest('/payment-methods');
    }

    // Obtener información del comercio
    async getMerchantInfo() {
        return await this.makeRequest('/merchant');
    }

    // Verificar conectividad con Rapikom
    async testConnection() {
        try {
            const response = await this.makeRequest('/health');
            return {
                success: true,
                message: 'Conexión exitosa con Rapikom',
                environment: this.environment
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión con Rapikom',
                error: error.message
            };
        }
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RapikomIntegration;
} else {
    window.RapikomIntegration = RapikomIntegration;
}
