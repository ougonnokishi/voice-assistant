class VoiceAssistantClient {
    constructor() {
        this.ws = null;
        this.mediaRecorder = null;
        this.audioStream = null;
        this.isRecording = false;
        
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.recordingStatus = document.getElementById('recordingStatus');
        this.conversationHistory = document.getElementById('conversationHistory');
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
    }
    
    async start() {
        try {
            await this.connectWebSocket();
            await this.startRecording();
            
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
        } catch (error) {
            console.error('Failed to start:', error);
            alert('エラーが発生しました: ' + error.message);
        }
    }
    
    stop() {
        this.stopRecording();
        this.disconnectWebSocket();
        
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
    }
    
    connectWebSocket() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.updateConnectionStatus('接続済み', 'connected');
                resolve();
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.updateConnectionStatus('切断', '');
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
    
    async startRecording() {
        try {
            this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const options = {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 16000
            };
            
            this.mediaRecorder = new MediaRecorder(this.audioStream, options);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(event.data);
                }
            };
            
            this.mediaRecorder.start(100);
            this.isRecording = true;
            this.updateRecordingStatus('録音中', 'recording');
            
        } catch (error) {
            throw new Error('マイクアクセスが拒否されました');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateRecordingStatus('停止中', '');
        }
        
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
    }
    
    handleServerMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'transcription':
                    this.addMessage('user', message.text);
                    break;
                case 'response':
                    this.addMessage('assistant', message.text);
                    break;
                case 'audio':
                    this.playAudio(message.audio);
                    break;
                case 'error':
                    console.error('Server error:', message.error);
                    this.addMessage('system', 'エラー: ' + message.error);
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
        
        messageDiv.appendChild(labelDiv);
        messageDiv.appendChild(contentDiv);
        
        this.conversationHistory.appendChild(messageDiv);
        this.conversationHistory.scrollTop = this.conversationHistory.scrollHeight;
    }
    
    playAudio(audioBase64) {
        const audio = new Audio('data:audio/mp3;base64,' + audioBase64);
        audio.play().catch(error => {
            console.error('Failed to play audio:', error);
        });
    }
    
    updateConnectionStatus(text, className) {
        this.connectionStatus.textContent = text;
        this.connectionStatus.className = 'status-value ' + className;
    }
    
    updateRecordingStatus(text, className) {
        this.recordingStatus.textContent = text;
        this.recordingStatus.className = 'status-value ' + className;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VoiceAssistantClient();
});