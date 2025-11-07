// Управление состоянием приложения
class MessengerApp {
    constructor() {
        this.currentUser = null;
        this.selectedFriend = null;
        this.users = [];
        this.messages = [];
        this.friends = {};
        this.useExternalDB = false;
        this.dbConfig = null;
        this.cachedData = null; // Кэш для быстрого доступа
        this.callState = {
            peerConnection: null,
            localStream: null,
            remoteStream: null,
            isCallActive: false,
            isVideoCall: false,
            isVideoEnabled: true,
            isAudioEnabled: true
        };
        this.init();
    }

    async init() {
        // Сначала настраиваем обработчики событий, чтобы кнопки работали сразу
        this.setupEventListeners();
        
        // Инициализируем внешнюю базу данных
        this.initExternalDB();
        
        // Загружаем данные
        await this.loadUsers();
        await this.loadMessages();
        await this.loadFriends();
        
        // Проверяем, есть ли активный пользователь
        const activeUser = localStorage.getItem('activeUser');
        if (activeUser) {
            try {
                this.currentUser = JSON.parse(activeUser);
                this.showMessenger();
            } catch (error) {
                console.error('Ошибка парсинга пользователя:', error);
                this.showAuth();
            }
        } else {
            this.showAuth();
        }

        this.renderFriends();
        this.checkForCallRequests();
        setInterval(() => this.checkForCallRequests(), 1000);
        
        // Синхронизация в реальном времени (без задержек)
        if (this.useExternalDB) {
            // Синхронизируем сразу после загрузки
            this.syncData();
            // И затем каждые 500мс для быстрых обновлений
            setInterval(() => this.syncData(), 500);
        }
    }

    initExternalDB() {
        if (typeof DATABASE_CONFIG !== 'undefined' && window.databaseReady) {
            this.useExternalDB = true;
            this.dbConfig = DATABASE_CONFIG;
            console.log('Внешняя база данных подключена');
        } else {
            this.useExternalDB = false;
            console.log('Используется локальное хранилище');
        }
    }

    async syncData() {
        if (!this.useExternalDB) return;
        try {
            // Загружаем все данные одним запросом
            const data = await this.fetchFromDB('all');
            if (!data) return;
            
            // Кэшируем данные для быстрого доступа
            this.cachedData = data;
            
            let needsUpdate = false;
            
            // Обновляем только если данные изменились
            if (data.users && Array.isArray(data.users) && JSON.stringify(data.users) !== JSON.stringify(this.users)) {
                this.users = data.users;
                localStorage.setItem('messengerUsers', JSON.stringify(this.users));
                needsUpdate = true;
            }
            
            if (data.messages && Array.isArray(data.messages) && JSON.stringify(data.messages) !== JSON.stringify(this.messages)) {
                this.messages = data.messages;
                localStorage.setItem('messengerMessages', JSON.stringify(this.messages));
                if (this.currentUser) {
                    this.renderMessages();
                }
                needsUpdate = true;
            }
            
            if (data.friends && typeof data.friends === 'object' && JSON.stringify(data.friends) !== JSON.stringify(this.friends)) {
                this.friends = data.friends;
                localStorage.setItem('messengerFriends', JSON.stringify(this.friends));
                if (this.currentUser) {
                    this.renderFriends();
                }
                needsUpdate = true;
            }
        } catch (error) {
            // Тихая ошибка, не блокируем работу
        }
    }

    setupEventListeners() {
        // Переключение вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Форма входа
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Форма регистрации
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Отправка сообщения
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Выход
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Добавление друга
        document.getElementById('addFriendBtn').addEventListener('click', () => {
            this.showAddFriendModal();
        });

        document.getElementById('closeAddFriendModal').addEventListener('click', () => {
            this.hideAddFriendModal();
        });

        document.getElementById('addFriendSubmitBtn').addEventListener('click', () => {
            this.addFriend();
        });

        document.getElementById('friendUsernameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addFriend();
            }
        });

        // Звонки
        document.getElementById('videoCallBtn').addEventListener('click', () => {
            this.startCall(true);
        });

        document.getElementById('audioCallBtn').addEventListener('click', () => {
            this.startCall(false);
        });

        document.getElementById('endCallBtn').addEventListener('click', () => {
            this.endCall();
        });

        document.getElementById('toggleVideoBtn').addEventListener('click', () => {
            this.toggleVideo();
        });

        document.getElementById('toggleAudioBtn').addEventListener('click', () => {
            this.toggleAudio();
        });

        // Закрытие модального окна по клику вне его
        document.getElementById('addFriendModal').addEventListener('click', (e) => {
            if (e.target.id === 'addFriendModal') {
                this.hideAddFriendModal();
            }
        });
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });

        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}Form`).classList.add('active');
        document.getElementById('authError').textContent = '';
    }

    async handleLogin() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        // Сначала загружаем актуальные данные (из внешней БД если доступна, иначе из localStorage)
        await this.loadUsers();
        
        const user = this.users.find(u => u.username === username);
        
        if (!user) {
            this.showError('Пользователь не найден');
            return;
        }

        if (user.password !== this.hashPassword(password)) {
            this.showError('Неверный пароль');
            return;
        }

        this.currentUser = { username: user.username };
        localStorage.setItem('activeUser', JSON.stringify(this.currentUser));
        this.showMessenger();
    }

    async handleRegister() {
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

        if (username.length < 3) {
            this.showError('Имя пользователя должно быть не менее 3 символов');
            return;
        }

        if (password.length < 4) {
            this.showError('Пароль должен быть не менее 4 символов');
            return;
        }

        if (password !== passwordConfirm) {
            this.showError('Пароли не совпадают');
            return;
        }

        // Загружаем актуальные данные из внешней БД (чтобы видеть пользователей с других устройств)
        await this.loadUsers();
        
        // Проверяем существование пользователя
        if (this.users.find(u => u.username === username)) {
            this.showError('Пользователь с таким именем уже существует');
            return;
        }

        const newUser = {
            username: username,
            password: this.hashPassword(password),
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        
        // Сохраняем в localStorage сразу (мгновенно)
        localStorage.setItem('messengerUsers', JSON.stringify(this.users));
        
        // Сохраняем во внешнюю БД (чтобы другие пользователи видели нового пользователя)
        await this.saveUsers();

        this.currentUser = { username: username };
        localStorage.setItem('activeUser', JSON.stringify(this.currentUser));
        this.showMessenger();
    }

    showError(message) {
        const errorEl = document.getElementById('authError');
        errorEl.textContent = message;
        setTimeout(() => {
            errorEl.textContent = '';
        }, 3000);
    }

    showAuth() {
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('messengerScreen').classList.add('hidden');
    }

    showMessenger() {
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('messengerScreen').classList.remove('hidden');
        document.getElementById('currentUsername').textContent = this.currentUser.username;
        this.renderFriends();
        this.renderMessages();
    }

    logout() {
        this.endCall();
        localStorage.removeItem('activeUser');
        this.currentUser = null;
        this.selectedFriend = null;
        this.showAuth();
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
    }

    // Система друзей
    showAddFriendModal() {
        document.getElementById('addFriendModal').classList.remove('hidden');
        document.getElementById('friendUsernameInput').focus();
    }

    hideAddFriendModal() {
        document.getElementById('addFriendModal').classList.add('hidden');
        document.getElementById('friendUsernameInput').value = '';
        document.getElementById('addFriendError').textContent = '';
    }

    async addFriend() {
        const username = document.getElementById('friendUsernameInput').value.trim();
        const errorEl = document.getElementById('addFriendError');

        if (!username) {
            errorEl.textContent = 'Введите имя пользователя';
            return;
        }

        if (username === this.currentUser.username) {
            errorEl.textContent = 'Нельзя добавить себя в друзья';
            return;
        }

        // Загружаем актуальные данные (чтобы видеть пользователей с других устройств)
        await this.loadUsers();
        await this.loadFriends();
        
        const user = this.users.find(u => u.username === username);
        if (!user) {
            errorEl.textContent = 'Пользователь не найден';
            return;
        }

        const userFriends = this.friends[this.currentUser.username] || [];
        if (userFriends.includes(username)) {
            errorEl.textContent = 'Этот пользователь уже в списке друзей';
            return;
        }

        if (!this.friends[this.currentUser.username]) {
            this.friends[this.currentUser.username] = [];
        }
        this.friends[this.currentUser.username].push(username);
        
        // Сохраняем в localStorage сразу (мгновенно)
        localStorage.setItem('messengerFriends', JSON.stringify(this.friends));
        
        // Сохраняем во внешнюю БД (чтобы другие пользователи видели изменения)
        await this.saveFriends();

        this.hideAddFriendModal();
        this.renderFriends();
    }

    selectFriend(username) {
        this.selectedFriend = username;
        document.getElementById('chatWithUser').textContent = `Чат с ${username}`;
        document.getElementById('callButtons').style.display = 'flex';
        this.renderFriends();
        this.renderMessages();
    }

    renderFriends() {
        const container = document.getElementById('friendsList');
        const userFriends = this.friends[this.currentUser.username] || [];

        container.innerHTML = '';

        if (userFriends.length === 0) {
            container.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">Нет друзей. Добавьте друга!</div>';
            return;
        }

        userFriends.forEach(username => {
            const friendEl = document.createElement('div');
            friendEl.className = `user-item ${this.selectedFriend === username ? 'active' : ''}`;
            friendEl.innerHTML = `
                <div class="user-item-content">
                    <span class="user-name" style="cursor: pointer;">${this.escapeHtml(username)}</span>
                    <div class="user-actions">
                        <button class="user-action-btn" data-action="remove" data-username="${this.escapeHtml(username)}" title="Удалить">🗑️</button>
                    </div>
                </div>
            `;

            friendEl.querySelector('.user-name').addEventListener('click', () => {
                this.selectFriend(username);
            });

            friendEl.querySelector('[data-action="remove"]').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFriend(username);
            });

            container.appendChild(friendEl);
        });
    }

    async removeFriend(username) {
        const userFriends = this.friends[this.currentUser.username] || [];
        this.friends[this.currentUser.username] = userFriends.filter(f => f !== username);
        
        // Сохраняем в localStorage сразу (мгновенно)
        localStorage.setItem('messengerFriends', JSON.stringify(this.friends));
        
        // Сохраняем во внешнюю БД (чтобы другие пользователи видели изменения)
        this.saveFriends().catch(() => {}); // Не блокируем UI, но сохраняем

        if (this.selectedFriend === username) {
            this.selectedFriend = null;
            document.getElementById('chatWithUser').textContent = 'Выберите друга для общения';
            document.getElementById('callButtons').style.display = 'none';
        }

        this.renderFriends();
        this.renderMessages();
    }

    // Сообщения
    async sendMessage() {
        if (!this.selectedFriend) {
            alert('Выберите друга для общения');
            return;
        }

        const input = document.getElementById('messageInput');
        const text = input.value.trim();

        if (!text) return;

        const message = {
            id: Date.now(),
            from: this.currentUser.username,
            to: this.selectedFriend,
            text: text,
            timestamp: new Date().toISOString()
        };

        this.messages.push(message);
        
        // Сохраняем в localStorage сразу (мгновенно)
        localStorage.setItem('messengerMessages', JSON.stringify(this.messages));
        
        // Отображаем сообщение сразу
        this.renderMessages();
        input.value = '';
        
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
        
        // Сохраняем во внешнюю БД (чтобы другие пользователи видели сообщение)
        this.saveMessages().catch(() => {}); // Не блокируем UI, но сохраняем
    }

    renderMessages() {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        if (!this.selectedFriend) {
            container.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">Выберите друга из списка для начала общения</div>';
            return;
        }

        const chatMessages = this.messages.filter(msg => 
            (msg.from === this.currentUser.username && msg.to === this.selectedFriend) ||
            (msg.from === this.selectedFriend && msg.to === this.currentUser.username)
        );

        if (chatMessages.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">Нет сообщений. Начните общение!</div>';
            return;
        }

        chatMessages.forEach(msg => {
            const isOwn = msg.from === this.currentUser.username;
            const messageEl = document.createElement('div');
            messageEl.className = `message ${isOwn ? 'own' : 'other'}`;
            
            const time = new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });

            messageEl.innerHTML = `
                ${!isOwn ? `<div class="message-header">${this.escapeHtml(msg.from)}</div>` : ''}
                <div class="message-text">${this.escapeHtml(msg.text)}</div>
                <div class="message-time">${time}</div>
            `;

            container.appendChild(messageEl);
        });

        container.scrollTop = container.scrollHeight;
    }

    // Звонки (WebRTC)
    async startCall(isVideoCall) {
        if (!this.selectedFriend) {
            alert('Выберите друга для звонка');
            return;
        }

        try {
            this.callState.isVideoCall = isVideoCall;
            this.callState.isVideoEnabled = isVideoCall;
            this.callState.isAudioEnabled = true;

            // Получаем доступ к камере/микрофону
            const constraints = {
                video: isVideoCall,
                audio: true
            };

            this.callState.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            const localVideo = document.getElementById('localVideo');
            localVideo.srcObject = this.callState.localStream;

            // Создаем peer connection
            this.callState.peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // Добавляем локальный поток
            this.callState.localStream.getTracks().forEach(track => {
                this.callState.peerConnection.addTrack(track, this.callState.localStream);
            });

            // Обработка удаленного потока
            this.callState.peerConnection.ontrack = (event) => {
                const remoteVideo = document.getElementById('remoteVideo');
                remoteVideo.srcObject = event.streams[0];
                this.callState.remoteStream = event.streams[0];
            };

            // Создаем offer
            const offer = await this.callState.peerConnection.createOffer();
            await this.callState.peerConnection.setLocalDescription(offer);

            // Сохраняем запрос на звонок
            const callRequest = {
                from: this.currentUser.username,
                to: this.selectedFriend,
                offer: offer,
                isVideoCall: isVideoCall,
                timestamp: Date.now()
            };

            localStorage.setItem(`callRequest_${this.selectedFriend}`, JSON.stringify(callRequest));
            localStorage.setItem(`callRequest_${this.currentUser.username}`, JSON.stringify({ status: 'initiating' }));

            // Показываем окно звонка
            this.showCallModal();
            document.getElementById('callTitle').textContent = `Звонок ${isVideoCall ? 'видео' : 'голосовой'} с ${this.selectedFriend}`;
            document.getElementById('callStatus').textContent = 'Соединение...';

            // Обновляем кнопки
            document.getElementById('toggleVideoBtn').style.display = isVideoCall ? 'flex' : 'none';

        } catch (error) {
            console.error('Ошибка при начале звонка:', error);
            alert('Не удалось начать звонок. Проверьте разрешения на камеру и микрофон.');
        }
    }

    checkForCallRequests() {
        if (!this.currentUser) return;

        const callRequestKey = `callRequest_${this.currentUser.username}`;
        const callRequest = localStorage.getItem(callRequestKey);

        if (callRequest) {
            try {
                const request = JSON.parse(callRequest);
                
                if (request.status === 'initiating') {
                    // Игнорируем собственные запросы
                    return;
                }

                if (request.from && request.to === this.currentUser.username && !this.callState.isCallActive) {
                    this.handleIncomingCall(request);
                    localStorage.removeItem(callRequestKey);
                }
            } catch (e) {
                console.error('Ошибка обработки запроса звонка:', e);
            }
        }
    }

    async handleIncomingCall(request) {
        if (!confirm(`${request.from} звонит вам (${request.isVideoCall ? 'видео' : 'голосовой'}). Принять?`)) {
            return;
        }

        try {
            this.callState.isVideoCall = request.isVideoCall;
            this.callState.isVideoEnabled = request.isVideoCall;
            this.callState.isAudioEnabled = true;
            this.selectedFriend = request.from;

            // Получаем доступ к камере/микрофону
            const constraints = {
                video: request.isVideoCall,
                audio: true
            };

            this.callState.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            const localVideo = document.getElementById('localVideo');
            localVideo.srcObject = this.callState.localStream;

            // Создаем peer connection
            this.callState.peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // Добавляем локальный поток
            this.callState.localStream.getTracks().forEach(track => {
                this.callState.peerConnection.addTrack(track, this.callState.localStream);
            });

            // Обработка удаленного потока
            this.callState.peerConnection.ontrack = (event) => {
                const remoteVideo = document.getElementById('remoteVideo');
                remoteVideo.srcObject = event.streams[0];
                this.callState.remoteStream = event.streams[0];
            };

            // Устанавливаем remote description
            await this.callState.peerConnection.setRemoteDescription(new RTCSessionDescription(request.offer));

            // Создаем answer
            const answer = await this.callState.peerConnection.createAnswer();
            await this.callState.peerConnection.setLocalDescription(answer);

            // Отправляем answer обратно
            const answerRequest = {
                from: this.currentUser.username,
                to: request.from,
                answer: answer,
                timestamp: Date.now()
            };

            localStorage.setItem(`callAnswer_${request.from}`, JSON.stringify(answerRequest));

            this.showCallModal();
            document.getElementById('callTitle').textContent = `Звонок ${request.isVideoCall ? 'видео' : 'голосовой'} с ${request.from}`;
            document.getElementById('callStatus').textContent = 'Соединено';
            document.getElementById('toggleVideoBtn').style.display = request.isVideoCall ? 'flex' : 'none';

            // Проверяем answer от инициатора
            this.checkForCallAnswer();

        } catch (error) {
            console.error('Ошибка при принятии звонка:', error);
            alert('Не удалось принять звонок.');
        }
    }

    checkForCallAnswer() {
        const answerKey = `callAnswer_${this.currentUser.username}`;
        const answerData = localStorage.getItem(answerKey);

        if (answerData && this.callState.peerConnection) {
            try {
                const answer = JSON.parse(answerData);
                this.callState.peerConnection.setRemoteDescription(new RTCSessionDescription(answer.answer));
                document.getElementById('callStatus').textContent = 'Соединено';
                localStorage.removeItem(answerKey);
            } catch (e) {
                console.error('Ошибка обработки ответа:', e);
            }
        }
    }

    showCallModal() {
        document.getElementById('callModal').classList.remove('hidden');
        this.callState.isCallActive = true;
    }

    endCall() {
        if (this.callState.localStream) {
            this.callState.localStream.getTracks().forEach(track => track.stop());
        }

        if (this.callState.peerConnection) {
            this.callState.peerConnection.close();
        }

        document.getElementById('localVideo').srcObject = null;
        document.getElementById('remoteVideo').srcObject = null;
        document.getElementById('callModal').classList.add('hidden');

        this.callState = {
            peerConnection: null,
            localStream: null,
            remoteStream: null,
            isCallActive: false,
            isVideoCall: false,
            isVideoEnabled: true,
            isAudioEnabled: true
        };

        // Очищаем запросы звонков
        if (this.selectedFriend) {
            localStorage.removeItem(`callRequest_${this.selectedFriend}`);
            localStorage.removeItem(`callAnswer_${this.selectedFriend}`);
        }
        localStorage.removeItem(`callRequest_${this.currentUser.username}`);
        localStorage.removeItem(`callAnswer_${this.currentUser.username}`);
    }

    toggleVideo() {
        if (!this.callState.localStream) return;

        const videoTrack = this.callState.localStream.getVideoTracks()[0];
        if (videoTrack) {
            this.callState.isVideoEnabled = !this.callState.isVideoEnabled;
            videoTrack.enabled = this.callState.isVideoEnabled;
            
            const btn = document.getElementById('toggleVideoBtn');
            if (this.callState.isVideoEnabled) {
                btn.classList.remove('disabled');
            } else {
                btn.classList.add('disabled');
            }
        }
    }

    toggleAudio() {
        if (!this.callState.localStream) return;

        const audioTrack = this.callState.localStream.getAudioTracks()[0];
        if (audioTrack) {
            this.callState.isAudioEnabled = !this.callState.isAudioEnabled;
            audioTrack.enabled = this.callState.isAudioEnabled;
            
            const btn = document.getElementById('toggleAudioBtn');
            if (this.callState.isAudioEnabled) {
                btn.classList.remove('disabled');
            } else {
                btn.classList.add('disabled');
            }
        }
    }

    // Утилиты
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Загрузка и сохранение данных (внешняя БД + LocalStorage fallback)
    async loadUsers() {
        if (this.useExternalDB) {
            try {
                const data = await this.fetchFromDB('all');
                if (data && Array.isArray(data.users)) {
                    this.users = data.users;
                    localStorage.setItem('messengerUsers', JSON.stringify(this.users));
                    return;
                }
            } catch (error) {
                console.warn('Ошибка загрузки пользователей из внешней БД:', error);
            }
        }
        
        // Fallback на localStorage
        const stored = localStorage.getItem('messengerUsers');
        this.users = stored ? JSON.parse(stored) : [];
    }

    async saveUsers() {
        // Всегда сохраняем в localStorage (уже сделано до вызова)
        if (!this.useExternalDB) return;
        
        // Сохраняем во внешнюю БД (чтобы другие пользователи видели изменения)
        try {
            // Используем кэшированные данные или загружаем быстро
            let allData = this.cachedData || await this.loadAllData().catch(() => ({ users: [], messages: [], friends: {} }));
            allData.users = this.users;
            // Сохраняем и обновляем кэш
            await this.saveToDB(allData);
            this.cachedData = allData;
        } catch (error) {
            console.warn('Ошибка сохранения пользователей во внешнюю БД:', error);
        }
    }

    async loadMessages() {
        if (this.useExternalDB) {
            try {
                const data = await this.fetchFromDB('all');
                if (data && Array.isArray(data.messages)) {
                    this.messages = data.messages;
                    localStorage.setItem('messengerMessages', JSON.stringify(this.messages));
                    return;
                }
            } catch (error) {
                console.warn('Ошибка загрузки сообщений из внешней БД:', error);
            }
        }
        
        // Fallback на localStorage
        const stored = localStorage.getItem('messengerMessages');
        this.messages = stored ? JSON.parse(stored) : [];
    }

    async saveMessages() {
        // Всегда сохраняем в localStorage (уже сделано до вызова)
        if (!this.useExternalDB) return;
        
        // Сохраняем во внешнюю БД (чтобы другие пользователи видели сообщения)
        try {
            // Используем кэшированные данные или загружаем быстро
            let allData = this.cachedData || await this.loadAllData().catch(() => ({ users: [], messages: [], friends: {} }));
            allData.messages = this.messages;
            // Сохраняем и обновляем кэш
            await this.saveToDB(allData);
            this.cachedData = allData;
        } catch (error) {
            console.warn('Ошибка сохранения сообщений во внешнюю БД:', error);
        }
    }

    async loadFriends() {
        if (this.useExternalDB) {
            try {
                const data = await this.fetchFromDB('all');
                if (data && data.friends && typeof data.friends === 'object') {
                    this.friends = data.friends;
                    localStorage.setItem('messengerFriends', JSON.stringify(this.friends));
                    return;
                }
            } catch (error) {
                console.warn('Ошибка загрузки друзей из внешней БД:', error);
            }
        }
        
        // Fallback на localStorage
        const stored = localStorage.getItem('messengerFriends');
        this.friends = stored ? JSON.parse(stored) : {};
    }

    async saveFriends() {
        // Всегда сохраняем в localStorage (уже сделано до вызова)
        if (!this.useExternalDB) return;
        
        // Сохраняем во внешнюю БД (чтобы другие пользователи видели изменения)
        try {
            // Используем кэшированные данные или загружаем быстро
            let allData = this.cachedData || await this.loadAllData().catch(() => ({ users: [], messages: [], friends: {} }));
            allData.friends = this.friends;
            // Сохраняем и обновляем кэш
            await this.saveToDB(allData);
            this.cachedData = allData;
        } catch (error) {
            console.warn('Ошибка сохранения друзей во внешнюю БД:', error);
        }
    }

    // Работа с внешней БД (JSONBin.io)
    async fetchFromDB(key) {
        if (!this.useExternalDB || !this.dbConfig) return null;
        
        try {
            const response = await fetch(`${this.dbConfig.apiUrl}/${this.dbConfig.binId}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': this.dbConfig.accessKey,
                    'X-Bin-Meta': 'false'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка API:', response.status, errorText);
                throw new Error(`Ошибка загрузки данных: ${response.status} ${errorText}`);
            }
            
            const result = await response.json();
            
            // Проверяем структуру ответа
            if (result.record) {
                return result.record;
            } else if (result.users || result.messages || result.friends) {
                // Если данные на верхнем уровне
                return result;
            } else {
                // Если структура пустая или неверная, возвращаем пустой объект
                return { users: [], messages: [], friends: {} };
            }
        } catch (error) {
            console.error('Ошибка получения данных:', error);
            // Не пробрасываем ошибку дальше, возвращаем null для fallback
            return null;
        }
    }

    async loadAllData() {
        // Используем кэш если есть
        if (this.cachedData) {
            return {
                users: this.cachedData.users || this.users || [],
                messages: this.cachedData.messages || this.messages || [],
                friends: this.cachedData.friends || this.friends || {}
            };
        }
        
        const data = await this.fetchFromDB('all');
        if (!data) {
            // Если не удалось загрузить, используем текущие данные
            return {
                users: this.users || [],
                messages: this.messages || [],
                friends: this.friends || {}
            };
        }
        
        // Кэшируем данные
        this.cachedData = data;
        
        // Убеждаемся, что все поля есть
        return {
            users: data.users || [],
            messages: data.messages || [],
            friends: data.friends || {}
        };
    }

    async saveToDB(data) {
        if (!this.useExternalDB || !this.dbConfig) return;
        
        try {
            // Убеждаемся, что структура данных правильная
            const dataToSave = {
                users: data.users || this.users || [],
                messages: data.messages || this.messages || [],
                friends: data.friends || this.friends || {}
            };
            
            const response = await fetch(`${this.dbConfig.apiUrl}/${this.dbConfig.binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.dbConfig.accessKey
                },
                body: JSON.stringify(dataToSave)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка сохранения API:', response.status, errorText);
                throw new Error(`Ошибка сохранения данных: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Данные сохранены:', result);
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
            // Не пробрасываем ошибку, чтобы не блокировать работу
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new MessengerApp();
});
