// netlify/functions/menu-api.js
const fetch = require('node-fetch'); // Certifique-se de que 'node-fetch' está no seu package.json para Netlify Functions

exports.handler = async function(event, context) {
    // Estas variáveis virão do Netlify Dashboard (Environment Variables)
    const GOOGLE_APP_SCRIPT_URL = process.env.GOOGLE_APP_SCRIPT_URL;
    const APP_SCRIPT_TOKEN = process.env.APP_SCRIPT_TOKEN;

    if (!GOOGLE_APP_SCRIPT_URL || !APP_SCRIPT_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: Missing environment variables.' })
        };
    }

    try {
        let response;
        let contentType = event.headers['content-type'] || '';

        // Handle GET requests (for fetching menu)
        if (event.httpMethod === 'GET') {
            const params = new URLSearchParams(event.queryStringParameters);
            // Adiciona o token à URL do Google Apps Script
            params.set('token', APP_SCRIPT_TOKEN);
            
            response = await fetch(`${GOOGLE_APP_SCRIPT_URL}?${params.toString()}`);
        } 
        // Handle POST requests (for sending orders)
        else if (event.httpMethod === 'POST') {
            const formData = new URLSearchParams();

            // Adiciona o token
            formData.append('token', APP_SCRIPT_TOKEN);

            // Analisa o corpo da requisição do cliente
            let requestBody;
            if (contentType.includes('application/x-www-form-urlencoded')) {
                requestBody = new URLSearchParams(event.body);
            } else if (contentType.includes('application/json')) {
                requestBody = JSON.parse(event.body);
            } else {
                // Fallback para FormData ou outros tipos, se necessário
                // Para simplificar, assumimos que o cliente envia dados JSON ou form-urlencoded
                // Se seu frontend envia FormData, você precisaria de uma lógica mais complexa aqui
                // ou fazer o frontend enviar JSON/form-urlencoded.
                requestBody = new URLSearchParams(event.body); // Tentar como URLSearchParams por padrão
            }

            // Adiciona os dados do cliente ao formData para o Google Apps Script
            for (const key in requestBody) {
                formData.append(key, requestBody[key]);
            }
            
            response = await fetch(GOOGLE_APP_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });
        } else {
            return {
                statusCode: 405,
                body: JSON.stringify({ message: 'Method Not Allowed' })
            };
        }
        
        const data = await response.json();
        
        return {
            statusCode: response.status,
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error) {
        console.error('API proxy error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch from external API.', error: error.message })
        };
    }
};