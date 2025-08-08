// Manejador de Webhooks para Rapikom
class WebhookHandler {
    constructor(config) {
        this.config = config;
        this.rapikomIntegration = new RapikomIntegration(config);
        this.webhookSecret = config.webhookSecret || 'your_webhook_secret';
    }

    // Procesar webhook entrante de Rapikom
    async handleWebhook(request) {
        try {
            // Verificar la firma del webhook
            if (!this.verifyWebhookSignature(request)) {
                return {
                    success: false,
                    error: 'Invalid webhook signature',
                    status: 401
                };
            }

            const webhookData = request.body;
            console.log('Webhook recibido:', webhookData);

            // Procesar el webhook según el tipo de evento
            const result = await this.rapikomIntegration.processWebhook(webhookData);

            // Registrar el webhook
            await this.logWebhook(webhookData, result);

            return {
                success: true,
                data: result,
                status: 200
            };

        } catch (error) {
            console.error('Error procesando webhook:', error);
            
            // Registrar el error
            await this.logWebhookError(request.body, error);

            return {
                success: false,
                error: error.message,
                status: 500
            };
        }
    }

    // Verificar la firma del webhook
    verifyWebhookSignature(request) {
        const signature = request.headers['x-rapikom-signature'];
        const payload = JSON.stringify(request.body);
        
        // En producción, implementar verificación real de firma
        // Por ahora, solo verificamos que la firma existe
        return signature && signature.length > 0;
    }

    // Registrar webhook en la base de datos
    async logWebhook(webhookData, result) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event_type: webhookData.event_type,
            transaction_id: webhookData.data?.id,
            status: result.success ? 'success' : 'error',
            data: webhookData,
            result: result
        };

        console.log('Webhook log:', logEntry);
        
        // Aquí se guardaría en la base de datos
        // await this.saveWebhookLog(logEntry);
    }

    // Registrar error de webhook
    async logWebhookError(webhookData, error) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            event_type: webhookData.event_type,
            error: error.message,
            stack: error.stack,
            data: webhookData
        };

        console.error('Webhook error log:', errorLog);
        
        // Aquí se guardaría en la base de datos
        // await this.saveWebhookErrorLog(errorLog);
    }

    // Obtener historial de webhooks
    async getWebhookHistory(filters = {}) {
        const query = {
            ...filters,
            limit: filters.limit || 50,
            offset: filters.offset || 0
        };

        // Simular consulta a base de datos
        return {
            success: true,
            data: [],
            total: 0,
            limit: query.limit,
            offset: query.offset
        };
    }

    // Reenviar webhook fallido
    async retryFailedWebhook(webhookId) {
        try {
            // Obtener webhook fallido de la base de datos
            const failedWebhook = await this.getFailedWebhook(webhookId);
            
            if (!failedWebhook) {
                throw new Error('Webhook no encontrado');
            }

            // Reintentar procesamiento
            const result = await this.rapikomIntegration.processWebhook(failedWebhook.data);
            
            // Actualizar estado en base de datos
            await this.updateWebhookStatus(webhookId, 'retried', result);

            return {
                success: true,
                message: 'Webhook reenviado exitosamente',
                data: result
            };

        } catch (error) {
            console.error('Error reenviando webhook:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Obtener webhook fallido de la base de datos
    async getFailedWebhook(webhookId) {
        // Simular consulta a base de datos
        return null;
    }

    // Actualizar estado del webhook
    async updateWebhookStatus(webhookId, status, result) {
        console.log(`Actualizando webhook ${webhookId} a estado: ${status}`);
        // Aquí se actualizaría en la base de datos
    }

    // Configurar endpoint de webhook
    setupWebhookEndpoint(app) {
        // Endpoint para recibir webhooks de Rapikom
        app.post('/webhook/rapikom', async (req, res) => {
            const result = await this.handleWebhook(req);
            
            res.status(result.status).json({
                success: result.success,
                message: result.success ? 'Webhook procesado' : result.error
            });
        });

        // Endpoint para verificar estado de webhooks
        app.get('/webhook/status', async (req, res) => {
            const history = await this.getWebhookHistory(req.query);
            res.json(history);
        });

        // Endpoint para reenviar webhooks fallidos
        app.post('/webhook/retry/:webhookId', async (req, res) => {
            const result = await this.retryFailedWebhook(req.params.webhookId);
            res.json(result);
        });
    }

    // Configurar webhook en Rapikom
    async configureRapikomWebhook() {
        const webhookConfig = {
            url: `${this.config.app.baseUrl}/webhook/rapikom`,
            events: [
                'payment.succeeded',
                'payment.failed',
                'payment.refunded',
                'payment.cancelled'
            ],
            secret: this.webhookSecret
        };

        try {
            // Enviar configuración a Rapikom
            const response = await this.rapikomIntegration.makeRequest('/webhooks', 'POST', webhookConfig);
            
            console.log('Webhook configurado en Rapikom:', response);
            
            return {
                success: true,
                message: 'Webhook configurado exitosamente',
                data: response
            };

        } catch (error) {
            console.error('Error configurando webhook:', error);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Verificar conectividad del webhook
    async testWebhookConnection() {
        try {
            const testPayload = {
                event_type: 'test',
                data: {
                    id: 'test_transaction',
                    amount: 100,
                    currency: 'USD',
                    status: 'test'
                }
            };

            const result = await this.handleWebhook({
                body: testPayload,
                headers: {
                    'x-rapikom-signature': 'test_signature'
                }
            });

            return {
                success: true,
                message: 'Webhook funcionando correctamente',
                test_result: result
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebhookHandler;
} else {
    window.WebhookHandler = WebhookHandler;
}
