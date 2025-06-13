class TextModeClient {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        
        this.connectBtn = document.getElementById('connectBtn');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        this.textInput = document.getElementById('textInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.llmStatus = document.getElementById('llmStatus');
        this.conversationHistory = document.getElementById('conversationHistory');
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        this.connectBtn.addEventListener('click', () => this.connect());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }
    
    async connect() {
        try {
            await this.connectWebSocket();
            
            this.connectBtn.disabled = true;
            this.disconnectBtn.disabled = false;
            this.textInput.disabled = false;
            this.sendBtn.disabled = false;
            this.textInput.focus();
        } catch (error) {
            console.error('Failed to connect:', error);
            alert('接続エラー: ' + error.message);
        }
    }
    
    disconnect() {
        this.disconnectWebSocket();
        
        this.connectBtn.disabled = false;
        this.disconnectBtn.disabled = true;
        this.textInput.disabled = true;
        this.sendBtn.disabled = true;
    }
    
    connectWebSocket() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/text`;
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.updateConnectionStatus('接続済み', 'connected');
                resolve();
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.updateConnectionStatus('切断', '');
                this.updateLLMStatus('待機中', '');
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(new Error('WebSocket接続エラー'));
            };
            
            this.ws.onmessage = (event) => {
                this.handleServerMessage(event.data);
            };
        });
    }
    
    disconnectWebSocket() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    
    sendMessage() {
        const text = this.textInput.value.trim();
        if (!text || !this.isConnected) return;
        
        this.ws.send(JSON.stringify({
            type: 'text',
            content: text
        }));
        
        this.addMessage('user', text);
        this.textInput.value = '';
        this.updateLLMStatus('処理中...', 'processing');
    }
    
    handleServerMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'response':
                    this.addMessage('assistant', message.text);
                    this.updateLLMStatus(`応答完了 (${message.source || 'AI'})`, 'completed');
                    setTimeout(() => {
                        this.updateLLMStatus('待機中', '');
                    }, 3000);
                    break;
                case 'error':
                    console.error('Server error:', message.error);
                    this.addMessage('system', 'エラー: ' + message.error);
                    this.updateLLMStatus('エラー', 'error');
                    break;
                case 'status':
                    this.updateLLMStatus(message.text, message.state);
                    break;
            }
        } catch (error) {
            console.error('Failed to parse server message:', error);
        }
    }
    
    addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'message-label';
        labelDiv.textContent = type === 'user' ? 'あなた' : type === 'assistant' ? 'AI' : 'システム';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString('ja-JP');
        timeDiv.style.fontSize = '12px';
        timeDiv.style.color = '#999';
        timeDiv.style.marginTop = '5px';
        
        messageDiv.appendChild(labelDiv);
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);
        
        this.conversationHistory.appendChild(messageDiv);
        this.conversationHistory.scrollTop = this.conversationHistory.scrollHeight;
    }
    
    updateConnectionStatus(text, className) {
        this.connectionStatus.textContent = text;
        this.connectionStatus.className = 'status-value ' + className;
    }
    
    updateLLMStatus(text, state) {
        this.llmStatus.textContent = text;
        this.llmStatus.className = 'status-value';
        
        switch (state) {
            case 'processing':
                this.llmStatus.style.color = '#f39c12';
                break;
            case 'completed':
                this.llmStatus.style.color = '#27ae60';
                break;
            case 'error':
                this.llmStatus.style.color = '#e74c3c';
                break;
            default:
                this.llmStatus.style.color = '#666';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TextModeClient();
});