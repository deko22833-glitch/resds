// Конфигурация Firebase
// ИНСТРУКЦИЯ: Замените эти значения на ваши данные из Firebase Console
// 1. Перейдите на https://console.firebase.google.com/
// 2. Создайте новый проект или выберите существующий
// 3. В настройках проекта найдите "Ваши приложения" → "Web"
// 4. Скопируйте конфигурацию и вставьте ниже

const firebaseConfig = {
    apiKey: "AIzaSyCc1dlrYbBU7c_17tXLkH4zajYzkVebWcQ",
    authDomain: "redsk-bb508.firebaseapp.com",
    databaseURL: "https://redsk-bb508-default-rtdb.firebaseio.com",
    projectId: "redsk-bb508",
    storageBucket: "redsk-bb508.firebasestorage.app",
    messagingSenderId: "617406017903",
    appId: "1:617406017903:web:ecf24aaec6998312f7f89a"
};

// Инициализация Firebase
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY" && typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        window.firebaseReady = true;
    } else {
        console.warn('Firebase не настроен. Используется локальное хранилище.');
        window.firebaseReady = false;
    }
} catch (error) {
    console.error('Ошибка инициализации Firebase:', error);
    window.firebaseReady = false;
}

