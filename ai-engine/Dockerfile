# AI engine (Python)
FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src

# Loop de análisis contra el backend (BACKEND_URL por entorno).
CMD ["python", "-m", "src.main"]
