# ==========================================
# OFISOLVE BACKEND - PRODUCTION DOCKERFILE
# ==========================================

FROM python:3.11-slim

# Evitar escritura de archivos .pyc y habilitar modo unbuffered para logs
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 8000

# Directorio de trabajo
WORKDIR /app

# Instalar dependencias de sistema (necesarias para psycopg2 y spacy)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Descargar modelo de lenguaje para Presidio (Privacidad)
RUN python -m spacy download es_core_news_sm

# Copiar el resto del código del backend
COPY . .

# Exponer puerto dinámico
EXPOSE 8000

# Comando de arranque (Uvicorn configurado para producción)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
