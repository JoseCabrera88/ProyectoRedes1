document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const connectionPanel = document.getElementById('connectionPanel');
    const mainPanel = document.getElementById('mainPanel');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');
    const connectionStatus = document.getElementById('connectionStatus');
    const currentRoomId = document.getElementById('currentRoomId');
    const connectedComputers = document.getElementById('connectedComputers');
    const totalTransmissions = document.getElementById('totalTransmissions');
    const localComputerName = document.getElementById('localComputerName');
    const remoteComputerName = document.getElementById('remoteComputerName');
    const targetComputer = document.getElementById('targetComputer');
    const lineStatus = document.getElementById('lineStatus');
    
    // Elementos de configuración
    const dataInput = document.getElementById('dataInput');
    const fileInput = document.getElementById('fileInput');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const transmitBtn = document.getElementById('transmitBtn');
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    
    // Elementos de navegación
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Elementos de progreso y visualización
    const progress1 = document.getElementById('progress1');
    const progress2 = document.getElementById('progress2');
    const progress1Text = document.getElementById('progress1Text');
    const progress2Text = document.getElementById('progress2Text');
    const transmissionAnimation = document.getElementById('transmissionAnimation');
    
    // Elementos de logs
    const encapsulationLogs = document.getElementById('encapsulationLogs');
    const decapsulationLogs = document.getElementById('decapsulationLogs');
    const networkLogs = document.getElementById('networkLogs');
    const transmissionLogs = document.getElementById('transmissionLogs');
    const receivedContent = document.getElementById('receivedContent');
    
    // Variables de estado
    let socket = null;
    let isTransmitting = false;
    let currentTransmission = null;
    let currentRoom = null;
    let computerName = '';
    let otherComputers = [];
    
    // Capas del modelo OSI
    const layers = [
        { id: 'layer7', name: 'Aplicación', description: 'Genera datos (texto/imagen/vídeo)' },
        { id: 'layer6', name: 'Presentación', description: 'Codificación, compresión y cifrado (simulado)' },
        { id: 'layer5', name: 'Sesión', description: 'Control de diálogo (SYN/ACK/FIN)' },
        { id: 'layer4', name: 'Transporte', description: 'TCP/UDP, Segmentación, Checksum' },
        { id: 'layer3', name: 'Red', description: 'Direccionamiento IP, TTL' },
        { id: 'layer2', name: 'Enlace', description: 'MAC, CRC para errores en trama' },
        { id: 'layer1', name: 'Física', description: 'Bits transmitidos con ruido (20% error)' }
    ];
    
    // Inicialización
    init();
    
    function init() {
        initializeEnhancedUI();
        initializeSocket();
        setupEventListeners();
        startBackgroundUpdates();
    }
    
    function initializeEnhancedUI() {
        // Navegación por pestañas principales
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                switchMainTab(tabId);
            });
        });
        
        // Log tabs
        document.querySelectorAll('.log-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const logType = tab.getAttribute('data-log');
                switchLogTab(logType);
            });
        });
        
        // Actualizar reloj en tiempo real
        updateClock();
        setInterval(updateClock, 1000);
    }
    
    function initializeSocket() {
        socket = io();
        
        socket.on('connect', () => {
            console.log('✅ Conectado al servidor');
            updateConnectionStatus('Conectado al servidor', 'connecting');
            showNotification('Conectado al servidor NetSim Pro', 'success');
        });
        
        socket.on('disconnect', () => {
            console.log('❌ Desconectado del servidor');
            updateConnectionStatus('Desconectado del servidor', 'disconnected');
            showNotification('Desconectado del servidor', 'error');
            showConnectionPanel();
        });
        
        socket.on('computer-joined', (data) => {
            console.log('👤 Computadora unida:', data.computerName);
            addNetworkLog(`${data.computerName} se ha unido a la sala`, 'join');
            showNotification(`${data.computerName} se unió a la sala`, 'info');
            updateConnectedComputers();
        });
        
        socket.on('computer-left', (data) => {
            console.log('👤 Computadora salió:', data.computerName);
            addNetworkLog(`${data.computerName} se ha desconectado`, 'leave');
            showNotification(`${data.computerName} abandonó la sala`, 'warning');
            updateConnectedComputers();
        });
        
        socket.on('room-update', (data) => {
            console.log('🔄 Actualización de sala:', data);
            updateRoomInfo(data);
        });
        
        socket.on('receive-transmission', (data) => {
            console.log('📨 Transmisión entrante:', data);
            handleReceivedTransmission(data);
        });
        
        socket.on('layer-update-received', (data) => {
            console.log('📊 Actualización de capa recibida:', data);
            handleLayerUpdate(data);
        });
        
        socket.on('transmission-completed', (data) => {
            console.log('✅ Transmisión completada por receptor:', data);
            addLog(`Transmisión recibida por ${data.sender}`, 'success', transmissionLogs);
            showNotification(`Transmisión de ${data.sender} completada`, 'success');
        });

        socket.on('transmission-sent', (data) => {
            console.log('📤 Confirmación de transmisión enviada:', data);
            addLog(`Transmisión #${data.transmissionId} enviada al servidor`, 'success', encapsulationLogs);
        });

        socket.on('transmission-error', (data) => {
            console.error('❌ Error de transmisión:', data);
            showNotification(`Error de transmisión: ${data.error}`, 'error');
            isTransmitting = false;
            transmitBtn.disabled = false;
        });

        socket.on('transmission-failed', (data) => {
            console.error('❌ Transmisión fallida:', data);
            addLog(`Transmisión fallida: ${data.error}`, 'error', transmissionLogs);
            showNotification(`Transmisión fallida: ${data.error}`, 'error');
        });
    }
    
    function setupEventListeners() {
        // Conexión
        createRoomBtn.addEventListener('click', createRoom);
        joinRoomBtn.addEventListener('click', joinRoom);
        leaveRoomBtn.addEventListener('click', leaveRoom);
        
        // Transmisión
        transmitBtn.addEventListener('click', startTransmission);
        clearLogsBtn.addEventListener('click', clearLogs);
        
        // Selectores de protocolo y tipo
        document.querySelectorAll('.protocol-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.protocol-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // Sincronizar con radio buttons ocultos
                const protocol = option.dataset.protocol;
                if (protocol === 'TCP') {
                    document.getElementById('tcp').checked = true;
                } else if (protocol === 'UDP') {
                    document.getElementById('udp').checked = true;
                }
            });
        });
        
        document.querySelectorAll('.type-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // Sincronizar con radio buttons ocultos
                const dataType = option.dataset.type;
                document.querySelectorAll('input[name="dataType"]').forEach(radio => {
                    radio.checked = radio.value === dataType;
                });
                
                updateFileUploadArea();
            });
        });
        
        // Upload de archivos
        fileUploadArea.addEventListener('click', () => fileInput.click());
        fileUploadArea.addEventListener('dragover', handleDragOver);
        fileUploadArea.addEventListener('dragleave', handleDragLeave);
        fileUploadArea.addEventListener('drop', handleFileDrop);
        fileInput.addEventListener('change', handleFileSelection);
    }
    
    function startBackgroundUpdates() {
        // Actualizar estadísticas cada 5 segundos
        setInterval(updateStats, 5000);
    }
    
    // ===== FUNCIONES DE CONEXIÓN =====
    function createRoom() {
        computerName = document.getElementById('computerName').value.trim();
        if (!computerName) {
            showNotification('Por favor, ingresa un nombre para tu computadora', 'error');
            return;
        }
        
        updateConnectionStatus('Creando sala...', 'connecting');
        
        fetch('/create-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                joinRoomAfterCreation(data.roomId);
            }
        })
        .catch(error => {
            console.error('Error creando sala:', error);
            updateConnectionStatus('Error creando sala', 'disconnected');
            showNotification('Error al crear la sala', 'error');
        });
    }
    
    function joinRoom() {
        computerName = document.getElementById('joinComputerName').value.trim();
        const roomId = document.getElementById('roomId').value.trim().toUpperCase();
        
        if (!computerName) {
            showNotification('Por favor, ingresa un nombre para tu computadora', 'error');
            return;
        }
        
        if (!roomId) {
            showNotification('Por favor, ingresa el ID de la sala', 'error');
            return;
        }
        
        updateConnectionStatus('Uniéndose a sala...', 'connecting');
        
        fetch('/join-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, computerName })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                joinRoomAfterCreation(roomId);
            } else {
                showNotification(data.error || 'Error al unirse a la sala', 'error');
                updateConnectionStatus('Error uniéndose a sala', 'disconnected');
            }
        })
        .catch(error => {
            console.error('Error uniéndose a sala:', error);
            updateConnectionStatus('Error uniéndose a sala', 'disconnected');
            showNotification('Error de conexión', 'error');
        });
    }
    
    function joinRoomAfterCreation(roomId) {
        socket.emit('join-room', { roomId, computerName });
        
        currentRoom = roomId;
        localComputerName.textContent = computerName;
        currentRoomId.textContent = roomId;
        
        updateConnectionStatus(`Conectado a sala ${roomId}`, 'connected');
        showMainPanel();
        
        addNetworkLog(`Te has unido a la sala ${roomId} como ${computerName}`, 'join');
        showNotification(`¡Bienvenido ${computerName}! Sala: ${roomId}`, 'success');
        
        // Solicitar información actualizada de la sala
        socket.emit('request-room-info', { roomId });
    }
    
    function leaveRoom() {
        if (socket && currentRoom) {
            socket.emit('leave-room', { roomId: currentRoom });
        }
        
        currentRoom = null;
        computerName = '';
        showConnectionPanel();
        clearLogs();
        
        updateConnectionStatus('Desconectado', 'disconnected');
        showNotification('Has abandonado la sala', 'info');
    }
    
    // ===== FUNCIONES DE TRANSMISIÓN =====
    function startTransmission() {
        console.log('🎯 Iniciando transmisión...');
        
        if (!socket || !currentRoom) {
            showNotification('No estás conectado a una sala', 'error');
            return;
        }
        
        if (isTransmitting) {
            showNotification('Ya hay una transmisión en curso', 'warning');
            return;
        }
        
        const target = targetComputer.value;
        if (!target) {
            showNotification('Selecciona una computadora destino', 'error');
            return;
        }
        
        // Obtener configuración
        const transmissionType = document.querySelector('.protocol-option.active').dataset.protocol;
        const dataType = document.querySelector('.type-option.active').dataset.type;
        
        console.log('🔧 Configuración:', { transmissionType, dataType, target });
        
        // Validar y obtener datos
        if (!validateTransmissionData(dataType)) {
            return;
        }
        
        if (dataType === 'Texto') {
            const data = dataInput.value.trim();
            continueTransmission(transmissionType, dataType, target, data, null);
        } else {
            const file = fileInput.files[0];
            console.log('📁 Procesando archivo:', file.name, file.size, file.type);
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result
                };
                continueTransmission(transmissionType, dataType, target, null, fileData);
            };
            reader.onerror = function(error) {
                console.error('❌ Error leyendo archivo:', error);
                showNotification('Error al leer el archivo', 'error');
            };
            reader.readAsDataURL(file);
        }
    }
    
    function validateTransmissionData(dataType) {
        if (dataType === 'Texto') {
            const data = dataInput.value.trim();
            if (!data) {
                showNotification('Por favor, ingresa un mensaje de texto', 'error');
                return false;
            }
            if (data.length > 10000) {
                showNotification('El mensaje es demasiado largo (máximo 10,000 caracteres)', 'error');
                return false;
            }
        } else {
            if (fileInput.files.length === 0) {
                showNotification('Por favor, selecciona un archivo', 'error');
                return false;
            }
            const file = fileInput.files[0];
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                showNotification('El archivo es demasiado grande (máximo 50MB)', 'error');
                return false;
            }
        }
        return true;
    }
    
    function continueTransmission(transmissionType, dataType, target, data, fileData) {
        isTransmitting = true;
        transmitBtn.disabled = true;
        
        currentTransmission = {
            id: Date.now(),
            type: transmissionType,
            dataType: dataType,
            target: target,
            data: data,
            file: fileData,
            timestamp: new Date()
        };
        
        console.log('🚀 Continuando transmisión:', currentTransmission);
        
        // Limpiar y preparar interfaz
        clearTransmissionLogs();
        resetProgress();
        switchMainTab('transmission');
        
        addLog(`Iniciando transmisión a ${target}...`, 'success', encapsulationLogs);
        addLog(`Tipo: ${transmissionType}, Datos: ${dataType}`, 'success', encapsulationLogs);
        
        // Notificar a la otra computadora
        socket.emit('start-transmission', {
            transmissionData: currentTransmission,
            targetComputer: target
        });
        
        // Iniciar simulación local
        simulateEncapsulation();
    }
    
    function simulateEncapsulation() {
        console.log('🔒 Iniciando encapsulamiento...');
        addLog('Iniciando proceso de encapsulamiento...', 'success', encapsulationLogs);
        
        let layerIndex = 0;
        const totalLayers = layers.length;
        
        function processNextLayer() {
            if (layerIndex >= totalLayers) {
                addLog('Encapsulamiento completado. Iniciando transmisión...', 'success', encapsulationLogs);
                // Asegurar que la barra de encapsulamiento muestre 100%
                updateProgress(100, parseFloat(progress2.style.width) || 0);
                socket.emit('layer-update', {
                    layer: totalLayers - 1,
                    progress: 100,
                    computer: computerName,
                    type: 'encapsulation'
                });
                simulateTransmission();
                return;
            }
            
            const layer = layers[layerIndex];
            const layerElement = document.getElementById(layer.id);
            
            // Activar capa visualmente
            activateLayer(layerElement);

            // Notificar progreso (escala 0-100)
            const progress = ((layerIndex + 1) / totalLayers) * 100;
            updateProgress(progress, 0);

            // Notificar a la otra computadora del progreso
            socket.emit('layer-update', {
                layer: layerIndex,
                progress: progress,
                computer: computerName,
                type: 'encapsulation'
            });

            // Simular procesamiento
            setTimeout(() => {
                addLog(`Capa ${7-layerIndex}: ${layer.name} - ${getLayerProcessDescription(layerIndex)}`, 'success', encapsulationLogs);
                deactivateLayer(layerElement);
                layerIndex++;
                processNextLayer();
            }, 600);
        }
        
        processNextLayer();
    }
    
    function simulateTransmission() {
        console.log('📡 Simulando transmisión...');
        addLog('Transmitiendo datos a través del medio...', 'success', encapsulationLogs);
        
        // Activar animación
        transmissionAnimation.classList.add('animating');

        // Simular tiempo de transmisión
        setTimeout(() => {
            transmissionAnimation.classList.remove('animating');
            
            // Simular error aleatorio (solo para TCP)
            const hasError = Math.random() < 0.2;
            
            if (hasError && currentTransmission.type === 'TCP') {
                addLog('❌ Error detectado durante la transmisión. Reintentando...', 'error', encapsulationLogs);
                showNotification('Error de transmisión - Reintentando...', 'warning');
                
                // Reintentar después de un delay
                setTimeout(simulateTransmission, 1000);
            } else {
                if (hasError) {
                    addLog('⚠️ Error detectado (UDP - Sin reintento)', 'warning', encapsulationLogs);
                    showNotification('Error de transmisión UDP - Datos pueden estar corruptos', 'warning');
                } else {
                    addLog('✅ Transmisión completada exitosamente.', 'success', encapsulationLogs);
                }
                
                // Notificar al servidor que la transmisión se completó
                socket.emit('transmission-complete', { 
                    transmission: currentTransmission 
                });
                
                // Completar localmente
                completeTransmission();
            }
        }, 2000);
    }
    
    function handleReceivedTransmission(data) {
        console.log('📨 Transmisión recibida:', data);
        addLog(`📥 Recibiendo transmisión #${data.transmissionId} de ${data.sender}...`, 'success', decapsulationLogs);
        showNotification(`Nueva transmisión de ${data.sender}`, 'info');
        
        currentTransmission = data.transmissionData;
        simulateDecapsulation();
    }
    
    function simulateDecapsulation() {
        console.log('📦 Iniciando desencapsulamiento...');
        addLog('Iniciando proceso de desencapsulamiento...', 'success', decapsulationLogs);
        
        let layerIndex = 0;
        const totalLayers = layers.length;
        
        function processNextLayer() {
            if (layerIndex >= totalLayers) {
                addLog('✅ Desencapsulamiento completado. Datos recibidos.', 'success', decapsulationLogs);
                // Asegurar que la barra de desencapsulamiento muestre 100%
                updateProgress(parseFloat(progress1.style.width) || 100, 100);
                socket.emit('layer-update', {
                    layer: totalLayers - 1,
                    progress: 100,
                    computer: computerName,
                    type: 'decapsulation'
                });
                displayReceivedData();
                showNotification('Transmisión recibida exitosamente', 'success');
                return;
            }
            
            const layer = layers[totalLayers - 1 - layerIndex];
            const layerElement = document.getElementById(layer.id + 'r');
            
            activateLayer(layerElement);
            
                const progress = ((layerIndex + 1) / totalLayers) * 100;
            updateProgress(parseFloat(progress1.style.width) || 0, progress);
            
            // Notificar progreso al emisor
            socket.emit('layer-update', {
                layer: layerIndex,
                progress: progress,
                computer: computerName,
                type: 'decapsulation'
            });
            
            setTimeout(() => {
                addLog(`Capa ${layerIndex + 1}: ${layer.name} - ${getLayerProcessDescription(totalLayers - 1 - layerIndex, true)}`, 'success', decapsulationLogs);
                deactivateLayer(layerElement);
                layerIndex++;
                processNextLayer();
            }, 600);
        }
        
        processNextLayer();
    }
    
    function completeTransmission() {
        console.log('🎉 Transmisión completada');
        isTransmitting = false;
        transmitBtn.disabled = false;
        
        addLog(`✅ Transmisión completada exitosamente.`, 'success', transmissionLogs);
        showNotification('Transmisión completada', 'success');
        
        // Cambiar a pestaña de análisis para ver resultados
        setTimeout(() => {
            switchMainTab('analysis');
        }, 1000);
    }
    
    // ===== FUNCIONES DE INTERFAZ =====
    function switchMainTab(tabId) {
        navBtns.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(tab => tab.classList.remove('active'));
        
        document.querySelector(`.nav-btn[data-tab="${tabId}"]`).classList.add('active');
        document.querySelector(`.${tabId}-tab`).classList.add('active');
    }
    
    function switchLogTab(logType) {
        document.querySelectorAll('.log-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.log-section').forEach(section => section.classList.remove('active'));
        
        document.querySelector(`.log-tab[data-log="${logType}"]`).classList.add('active');
        document.getElementById(`${logType}Logs`).classList.add('active');
    }
    
    function updateRoomInfo(data) {
        connectedComputers.textContent = data.computers.length;
        totalTransmissions.textContent = data.roomData?.transmissions || 0;
        
        otherComputers = data.computers.filter(name => name !== computerName);
        
        // Actualizar selector de destino
        targetComputer.innerHTML = '<option value="">Seleccionar destino...</option>';
        otherComputers.forEach(computer => {
            const option = document.createElement('option');
            option.value = computer;
            option.textContent = computer;
            targetComputer.appendChild(option);
        });
        
        // Actualizar estado de conexión
        if (otherComputers.length === 1) {
            remoteComputerName.textContent = otherComputers[0];
            lineStatus.innerHTML = '<div class="status-pulse"></div><span>Conectado • 1.2 Gbps</span>';
            lineStatus.className = 'connection-status connected';
        } else if (otherComputers.length > 1) {
            remoteComputerName.textContent = 'Múltiples computadoras';
            lineStatus.innerHTML = '<div class="status-pulse"></div><span>Conectado • 1.2 Gbps</span>';
            lineStatus.className = 'connection-status connected';
        } else {
            remoteComputerName.textContent = 'Computadora Remota';
            lineStatus.innerHTML = '<div class="status-pulse"></div><span>Desconectado</span>';
            lineStatus.className = 'connection-status disconnected';
        }
    }
    
    function updateProgress(progress1Value, progress2Value) {
        progress1.style.width = progress1Value + '%';
        progress2.style.width = progress2Value + '%';
        progress1Text.textContent = Math.round(progress1Value) + '%';
        progress2Text.textContent = Math.round(progress2Value) + '%';
    }
    
    function activateLayer(layerElement) {
        layerElement.classList.add('active');
    }
    
    function deactivateLayer(layerElement) {
        layerElement.classList.remove('active');
    }
    
    function resetProgress() {
        updateProgress(0, 0);
        document.querySelectorAll('.layer-card').forEach(layer => {
            layer.classList.remove('active');
        });
    }
    
    // ===== MANEJO DE ARCHIVOS =====
    function handleDragOver(e) {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--primary)';
        fileUploadArea.style.background = 'rgba(99, 102, 241, 0.1)';
    }
    
    function handleDragLeave() {
        fileUploadArea.style.borderColor = 'var(--glass-border)';
        fileUploadArea.style.background = 'transparent';
    }
    
    function handleFileDrop(e) {
        e.preventDefault();
        handleDragLeave();
        
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelection();
        }
    }
    
    function handleFileSelection() {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const text = fileUploadArea.querySelector('p');
            text.innerHTML = `
                <i class="fas fa-check-circle" style="color: var(--success);"></i>
                <strong>${file.name}</strong><br>
                <small>${(file.size / 1024 / 1024).toFixed(2)} MB • ${file.type}</small>
            `;
        }
    }
    
    function updateFileUploadArea() {
        const dataType = document.querySelector('.type-option.active').dataset.type;
        
        if (dataType === 'Texto') {
            fileUploadArea.style.display = 'none';
        } else {
            fileUploadArea.style.display = 'block';
            const icon = fileUploadArea.querySelector('i');
            const text = fileUploadArea.querySelector('p');
            
            if (dataType === 'Imagen') {
                icon.className = 'fas fa-image';
                text.innerHTML = 'Arrastra imágenes aquí o haz clic para seleccionar';
            } else if (dataType === 'Video') {
                icon.className = 'fas fa-video';
                text.innerHTML = 'Arrastra videos aquí o haz clic para seleccionar';
            }
        }
    }
    
    // ===== VISUALIZACIÓN DE DATOS =====
    function displayReceivedData() {
        console.log('📊 Mostrando datos recibidos:', currentTransmission);
        receivedContent.innerHTML = '';
        
        if (currentTransmission.dataType === 'Texto') {
            const textElement = document.createElement('div');
            textElement.className = 'received-text';
            textElement.textContent = currentTransmission.data;
            receivedContent.appendChild(textElement);
        } else if (currentTransmission.dataType === 'Imagen' && currentTransmission.file) {
            const imgElement = document.createElement('img');
            imgElement.className = 'received-image';
            imgElement.src = currentTransmission.file.data;
            imgElement.alt = currentTransmission.file.name;
            receivedContent.appendChild(imgElement);
        } else if (currentTransmission.dataType === 'Video' && currentTransmission.file) {
            const videoElement = document.createElement('video');
            videoElement.className = 'received-video';
            videoElement.src = currentTransmission.file.data;
            videoElement.controls = true;
            videoElement.style.maxWidth = '100%';
            receivedContent.appendChild(videoElement);
        } else {
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.innerHTML = '<p>❌ No se pudieron cargar los datos recibidos</p>';
            receivedContent.appendChild(errorElement);
        }
        
        // Información de la transmisión
        const infoElement = document.createElement('div');
        infoElement.className = 'transmission-info';
        infoElement.innerHTML = `
            <p><strong>De:</strong> ${currentTransmission.target || 'Desconocido'}</p>
            <p><strong>Protocolo:</strong> ${currentTransmission.type}</p>
            <p><strong>Tipo:</strong> ${currentTransmission.dataType}</p>
            <p><strong>Hora:</strong> ${new Date(currentTransmission.timestamp).toLocaleTimeString()}</p>
        `;
        receivedContent.appendChild(infoElement);
    }
    
    // ===== FUNCIONES UTILITARIAS =====
    function updateConnectionStatus(message, status) {
        const indicator = connectionStatus.querySelector('.status-indicator');
        indicator.className = `status-indicator ${status}`;
        indicator.querySelector('span').textContent = message;
        document.getElementById('connectionStat').textContent = status === 'connected' ? 'Online' : 'Offline';
    }
    
    function showConnectionPanel() {
        connectionPanel.style.display = 'block';
        mainPanel.style.display = 'none';
    }
    
    function showMainPanel() {
        connectionPanel.style.display = 'none';
        mainPanel.style.display = 'block';
    }
    
    function updateClock() {
        document.getElementById('timeStat').textContent = new Date().toLocaleTimeString();
    }
    
    function updateStats() {
        // Estadísticas simuladas
        document.getElementById('transmissionCount').textContent = 
            Math.floor(Math.random() * 50);
        document.getElementById('speedStat').textContent = 
            (1 + Math.random() * 0.5).toFixed(1) + ' Gbps';
        document.getElementById('reliabilityStat').textContent = 
            (98 + Math.random() * 2).toFixed(1) + '%';
        document.getElementById('latencyStat').textContent = 
            Math.floor(10 + Math.random() * 10) + 'ms';
    }
    
    function showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    function getNotificationIcon(type) {
        const icons = {
            'info': 'info-circle',
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle'
        };
        return icons[type] || 'info-circle';
    }
    
    function addLog(message, type = 'success', container) {
        // Si container es un string, obtener el elemento
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        container.appendChild(logEntry);
        container.scrollTop = container.scrollHeight;
    }
    
    function addNetworkLog(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        networkLogs.appendChild(logEntry);
        networkLogs.scrollTop = networkLogs.scrollHeight;
    }
    
    function clearLogs() {
        encapsulationLogs.innerHTML = '<div class="log-placeholder"><i class="fas fa-layer-group"></i><p>Los logs de encapsulamiento aparecerán aquí</p></div>';
        decapsulationLogs.innerHTML = '<div class="log-placeholder"><i class="fas fa-cube"></i><p>Los logs de desencapsulamiento aparecerán aquí</p></div>';
        networkLogs.innerHTML = '<div class="log-placeholder"><i class="fas fa-network-wired"></i><p>Los logs de red aparecerán aquí</p></div>';
        
        if (transmissionLogs) {
            transmissionLogs.innerHTML = '<div class="log-placeholder"><i class="fas fa-exchange-alt"></i><p>Los logs generales de transmisión aparecerán aquí</p></div>';
        }
        
        receivedContent.innerHTML = '<div class="data-placeholder"><i class="fas fa-inbox"></i><h4>No hay datos recibidos</h4><p>Los datos transmitidos aparecerán aquí</p></div>';
    }
    
    function clearTransmissionLogs() {
        encapsulationLogs.innerHTML = '';
        decapsulationLogs.innerHTML = '';
    }
    
    function getLayerProcessDescription(layerIndex, isReceiver = false) {
        const layerActions = [
            { sender: 'Datos generados por la aplicación', receiver: 'Datos entregados a la aplicación' },
            { sender: 'Datos codificados y comprimidos', receiver: 'Datos decodificados y descomprimidos' },
            { sender: 'Sesión establecida (SYN/ACK)', receiver: 'Sesión confirmada (ACK)' },
            { sender: 'Segmentación y checksum calculado', receiver: 'Segmentos reensamblados y checksum verificado' },
            { sender: 'Direccionamiento IP y TTL establecido', receiver: 'Paquetes reensamblados y TTL verificado' },
            { sender: 'Trama formada con CRC', receiver: 'CRC verificado y trama aceptada' },
            { sender: 'Bits convertidos para transmisión', receiver: 'Bits recibidos y convertidos' }
        ];
        
        return isReceiver ? layerActions[layerIndex].receiver : layerActions[layerIndex].sender;
    }
    
    function handleLayerUpdate(data) {
        if (data.type === 'encapsulation') {
            updateProgress(data.progress, parseFloat(progress2.style.width) || 0);
        } else if (data.type === 'decapsulation') {
            updateProgress(parseFloat(progress1.style.width) || 0, data.progress);
        }
    }
    
    function updateConnectedComputers() {
        if (socket && currentRoom) {
            socket.emit('request-room-info', { roomId: currentRoom });
        }
    }
});