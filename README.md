# MLHub

Внутренний каталог ML-моделей с прокси-доступом к Hugging Face API. Позволяет получать доступ к моделям с Hugging Face и отправлять запросы к нимчерез единый интерфейс.

## Стек

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Django 5 + Django REST Framework
- **База данных:** PostgreSQL 15

---

## Быстрый старт через Docker

Скопируйте `.env.example` в `.env` и заполните значения:

```bash
cp .env.example .env
```

Запустите контейнеры:

```bash
docker-compose up --build
```

После запуска:

- Фронтенд: http://localhost:5173
- Backend API: http://localhost:8000/api/v1

База данных создаётся и мигрируется автоматически.

---

## Локальный запуск

### Требования

- Python 3.11+
- Node.js 18+
- PostgreSQL 15

### Настройка окружения

Все переменные окружения хранятся в одном файле `.env` в корне проекта. Скопируйте шаблон и заполните значения:

```bash
cp .env.example .env
```

Для локального запуска измени в `.env`:

```env
DB_HOST=localhost
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_MEDIA_BASE_URL=http://localhost:8000
```

Сгенерировать `FERNET_KEY`:

```python
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
```

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API будет доступен на http://localhost:8000/api/v1

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Откроется на http://localhost:5173

---

## Переменные окружения

Все переменные задаются в одном файле `.env` в корне проекта (шаблон — `.env.example`).

| Переменная    | Описание                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `SECRET_KEY`          | Django secret key                                                                           |
| `DEBUG`               | Режим отладки (`True` / `False`)                                            |
| `ALLOWED_HOSTS`       | Список разрешённых хостов через запятую                  |
| `FERNET_KEY`          | Ключ для шифрования Hugging Face токенов пользователей |
| `DB_NAME`             | Имя базы данных                                                                |
| `DB_USER`             | Пользователь PostgreSQL                                                         |
| `DB_PASSWORD`         | Пароль PostgreSQL                                                                     |
| `DB_HOST`             | Хост БД (`localhost` для локального запуска, `db` в Docker)  |
| `DB_PORT`             | Порт PostgreSQL (по умолчанию `5432`)                                      |
| `VITE_API_BASE_URL`   | URL backend API для фронтенда                                                   |
| `VITE_MEDIA_BASE_URL` | URL backend для медиафайлов                                                   |

---

## Как пользоваться

### Регистрация и вход

Создайте аккаунт на странице регистрации. По умолчанию все пользователи получают роль `USER`.

### Hugging Face токен

Чтобы отправлять запросы к моделям, нужно добавить личный токен Hugging Face в профиле (страница «Профиль»). Токен шифруется перед сохранением и используется только для проксирования запросов.

### Роли

| Роль  | Возможности                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `USER`  | Просмотр моделей, отправка запросов, история своих логов                                                                              |
| `ADMIN` | Всё выше + создание/редактирование/удаление моделей и тегов, просмотр всех логов, экспорт логов в CSV |

### Запрос к модели

Выберите модель из каталога и отправьте запрос. Результат — текст или изображение в зависимости от типа модели. Каждый запрос логируется.

### Создание суперпользователя (admin)

```bash
python manage.py createsuperuser
```

Или через Django Admin: http://localhost:8000/admin — там же можно вручную выдать роль `ADMIN` любому пользователю.

---

## Тесты

```bash
cd backend
coverage run manage.py test
```
