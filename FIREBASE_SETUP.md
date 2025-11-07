# Инструкция по настройке Firebase

## Шаг 1: Получите конфигурацию из Firebase Console

1. Откройте https://console.firebase.google.com/
2. Создайте новый проект (или выберите существующий)
3. Нажмите на иконку шестеренки ⚙️ рядом с "Project Overview"
4. Выберите "Project settings"
5. Прокрутите вниз до раздела "Your apps"
6. Нажмите на иконку Web `</>`
7. Зарегистрируйте приложение (можно указать любое имя, например "Messenger")
8. Скопируйте конфигурацию, которая будет выглядеть так:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbc123xyz...",
  authDomain: "my-project.firebaseapp.com",
  databaseURL: "https://my-project-default-rtdb.firebaseio.com",
  projectId: "my-project",
  storageBucket: "my-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

## Шаг 2: Вставьте конфигурацию в файл

Откройте файл `firebase-config.js` и замените строки 8-16:

**БЫЛО:**
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

**СТАЛО (с вашими данными):**
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyAbc123xyz...",  // ← вставьте ваш apiKey
    authDomain: "my-project.firebaseapp.com",  // ← вставьте ваш authDomain
    databaseURL: "https://my-project-default-rtdb.firebaseio.com",  // ← вставьте ваш databaseURL
    projectId: "my-project",  // ← вставьте ваш projectId
    storageBucket: "my-project.appspot.com",  // ← вставьте ваш storageBucket
    messagingSenderId: "123456789012",  // ← вставьте ваш messagingSenderId
    appId: "1:123456789012:web:abc123def456"  // ← вставьте ваш appId
};
```

## Шаг 3: Создайте Realtime Database

1. В Firebase Console перейдите в "Realtime Database"
2. Нажмите "Создать базу данных"
3. Выберите "Режим тестирования"
4. Выберите регион (ближайший к вам)
5. После создания, перейдите в "Правила" и установите:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Внимание:** Эти правила открывают доступ всем. Для продакшена настройте безопасность!

## Готово!

Теперь откройте `index.html` в браузере и проверьте работу. Пользователи с разных компьютеров смогут регистрироваться и общаться!

