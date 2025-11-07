// Конфигурация внешней базы данных (JSONBin.io)
// ИНСТРУКЦИЯ: 
// 1. Перейдите на https://jsonbin.io/
// 2. Зарегистрируйтесь (бесплатно)
// 3. Создайте новый bin
// 4. Скопируйте Bin ID и вставьте ниже
// 5. Скопируйте Access Key (из настроек аккаунта) и вставьте ниже

const DATABASE_CONFIG = {
    // Bin ID - получите после создания bin на jsonbin.io
    binId: "690d7119ae596e708f49a671",
    
    // Access Key - получите в настройках аккаунта на jsonbin.io
    accessKey: "$2a$10$uxlz0Lq06FKIUbysC4jNB.CSRTkYbfzs/VEQWDyKX4xxM/rcrxOju",
    
    // URL API (не меняйте)
    apiUrl: "https://api.jsonbin.io/v3/b"
};

// Проверка настройки
window.databaseReady = DATABASE_CONFIG.binId !== "YOUR_BIN_ID" && DATABASE_CONFIG.accessKey !== "YOUR_ACCESS_KEY";

