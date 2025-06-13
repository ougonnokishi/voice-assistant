const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { Transform } = require('stream');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const textWss = new WebSocket.Server({ server, path: '/text' });

app.use(express.static(path.join(__dirname, 'public')));

let speechClient = null;
let ttsClient = null;

try {
    speechClient = new speech.SpeechClient();
    ttsClient = new textToSpeech.TextToSpeechClient();
    console.log('Google Cloud services initialized');
} catch (error) {
    console.warn('Google Cloud services not available:', error.message);
}
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class VoiceAssistantServer {
    constructor() {
        this.clients = new Map();
        this.textClients = new Map();
        this.setupWebSocket();
        this.setupTextWebSocket();
    }
    
    createSpeechStream(clientId) {
        if (!speechClient) {
            console.warn('Speech client not available');
            return null;
        }
        
        const request = {
            config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: 'ja-JP',
                enableAutomaticPunctuation: true,
                model: 'latest_long'
            },
            interimResults: true
        };
        
        const recognizeStream = speechClient
            .streamingRecognize(request)
            .on('error', (error) => {
                console.error('Speech recognition error:', error);
                const client = this.clients.get(clientId);
                if (client) {
                    this.sendMessage(client.ws, {
                        type: 'error',
                        error: '音声認識エラー: ' + error.message
                    });
                }
            })
            .on('data', (data) => {
                const client = this.clients.get(clientId);
                if (!client) return;
                
                if (data.results[0] && data.results[0].alternatives[0]) {
                    const transcript = data.results[0].alternatives[0].transcript;
                    const isFinal = data.results[0].isFinal;
                    
                    if (isFinal) {
                        console.log('Final transcript:', transcript);
                        this.sendMessage(client.ws, {
                            type: 'transcription',
                            text: transcript
                        });
                        
                        this.processTranscript(clientId, transcript);
                    }
                }
            });
            
        return recognizeStream;
    }
    
    async processTranscript(clientId, transcript) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        console.log(`Processing transcript for ${clientId}: ${transcript}`);
        
        try {
            const llmResponse = await this.getLLMResponse(transcript);
            
            this.sendMessage(client.ws, {
                type: 'response',
                text: llmResponse
            });
            
            const audioData = await this.synthesizeSpeech(llmResponse);
            
            if (audioData) {
                this.sendMessage(client.ws, {
                    type: 'audio',
                    audio: audioData
                });
            }
            
        } catch (error) {
            console.error('Error processing transcript:', error);
            this.sendMessage(client.ws, {
                type: 'error',
                error: 'レスポンス生成エラー: ' + error.message
            });
        }
    }
    
    async getLLMResponse(userInput) {
        const claudePromise = this.getClaudeResponse(userInput);
        const openaiPromise = this.getOpenAIResponse(userInput);
        
        try {
            const result = await Promise.race([
                claudePromise.then(response => ({ source: 'Claude', response })),
                openaiPromise.then(response => ({ source: 'OpenAI', response }))
            ]);
            
            console.log(`Response from ${result.source}: ${result.response}`);
            return result.response;
            
        } catch (error) {
            console.error('All LLMs failed:', error);
            
            try {
                const claudeResponse = await claudePromise.catch(() => null);
                if (claudeResponse) return claudeResponse;
                
                const openaiResponse = await openaiPromise.catch(() => null);
                if (openaiResponse) return openaiResponse;
                
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            }
            
            throw new Error('すべてのLLMが応答できませんでした');
        }
    }
    
    async getClaudeResponse(userInput) {
        try {
            const message = await anthropic.messages.create({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1000,
                temperature: 0.7,
                system: 'あなたは親切で有能な音声アシスタントです。簡潔で自然な日本語で応答してください。',
                messages: [{
                    role: 'user',
                    content: userInput
                }]
            });
            
            return message.content[0].text;
        } catch (error) {
            console.error('Claude API error:', error);
            throw error;
        }
    }
    
    async getOpenAIResponse(userInput) {
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'あなたは親切で有能な音声アシスタントです。簡潔で自然な日本語で応答してください。'
                    },
                    {
                        role: 'user',
                        content: userInput
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });
            
            return completion.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI API error:', error);
            throw error;
        }
    }
    
    async synthesizeSpeech(text) {
        if (!ttsClient) {
            console.warn('TTS client not available');
            return null;
        }
        
        const request = {
            input: { text },
            voice: {
                languageCode: 'ja-JP',
                name: 'ja-JP-Neural2-B',
                ssmlGender: 'FEMALE'
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.0,
                pitch: 0.0
            }
        };
        
        try {
            const [response] = await ttsClient.synthesizeSpeech(request);
            return response.audioContent.toString('base64');
        } catch (error) {
            console.error('TTS error:', error);
            throw error;
        }
    }
    
    setupWebSocket() {
        wss.on('connection', (ws) => {
            const clientId = this.generateClientId();
            console.log(`Client connected: ${clientId}`);
            
            const client = {
                id: clientId,
                ws: ws,
                audioBuffer: [],
                speechStream: null
            };
            
            this.clients.set(clientId, client);
            
            client.speechStream = this.createSpeechStream(clientId);
            
            ws.on('message', async (data) => {
                await this.handleClientMessage(clientId, data);
            });
            
            ws.on('close', () => {
                console.log(`Client disconnected: ${clientId}`);
                const client = this.clients.get(clientId);
                if (client && client.speechStream) {
                    client.speechStream.end();
                }
                this.clients.delete(clientId);
            });
            
            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, error);
            });
        });
    }
    
    generateClientId() {
        return 'client_' + Math.random().toString(36).substr(2, 9);
    }
    
    async handleClientMessage(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        try {
            if (client.speechStream && client.speechStream.writable) {
                client.speechStream.write(data);
            }
        } catch (error) {
            console.error('Error handling client message:', error);
            this.sendMessage(client.ws, {
                type: 'error',
                error: error.message
            });
        }
    }
    
    sendMessage(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    
    setupTextWebSocket() {
        textWss.on('connection', (ws) => {
            const clientId = this.generateClientId();
            console.log(`Text client connected: ${clientId}`);
            
            const client = {
                id: clientId,
                ws: ws
            };
            
            this.textClients.set(clientId, client);
            
            ws.on('message', async (data) => {
                await this.handleTextMessage(clientId, data);
            });
            
            ws.on('close', () => {
                console.log(`Text client disconnected: ${clientId}`);
                this.textClients.delete(clientId);
            });
            
            ws.on('error', (error) => {
                console.error(`WebSocket error for text client ${clientId}:`, error);
            });
        });
    }
    
    async handleTextMessage(clientId, data) {
        const client = this.textClients.get(clientId);
        if (!client) return;
        
        try {
            const message = JSON.parse(data);
            
            if (message.type === 'text' && message.content) {
                console.log(`Text message from ${clientId}: ${message.content}`);
                
                this.sendMessage(client.ws, {
                    type: 'status',
                    text: 'LLMに問い合わせ中...',
                    state: 'processing'
                });
                
                const startTime = Date.now();
                const llmResponse = await this.getLLMResponse(message.content);
                const responseTime = Date.now() - startTime;
                
                const source = responseTime < 3000 ? 'Claude' : 'OpenAI';
                
                this.sendMessage(client.ws, {
                    type: 'response',
                    text: llmResponse,
                    source: source,
                    responseTime: responseTime
                });
            }
            
        } catch (error) {
            console.error('Error handling text message:', error);
            this.sendMessage(client.ws, {
                type: 'error',
                error: error.message
            });
        }
    }
}

const voiceAssistant = new VoiceAssistantServer();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});