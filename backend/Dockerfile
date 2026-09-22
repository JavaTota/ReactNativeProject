FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 3001
CMD ["uvicorn", "main:application", "--factory", "--host", "0.0.0.0", "--port", "3001", "--no-proxy-headers"]
