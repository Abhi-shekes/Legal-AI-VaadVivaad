# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first for better layer caching
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Bake the BM25 vocabulary into the image rather than fetching it on first
# use. It is a stopword list and a stemmer, not model weights -- a few
# hundred kilobytes -- but downloading it at runtime would mean a network
# round trip on every cold start, under a non-root user with no writable
# cache directory. Baked here, hybrid retrieval works offline.
ENV FASTEMBED_CACHE_PATH=/opt/fastembed
RUN python -c "from fastembed import SparseTextEmbedding; \
    SparseTextEmbedding(model_name='Qdrant/bm25')" \
    && chmod -R a+rX /opt/fastembed

COPY . .

# Run as a non-root user
RUN groupadd --gid 1001 vaadvivaad \
    && useradd --uid 1001 --gid vaadvivaad --no-create-home --shell /usr/sbin/nologin vaadvivaad \
    && chown -R vaadvivaad:vaadvivaad /app
USER vaadvivaad

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).status == 200 else 1)"

# Run the FastAPI server wrapped with the Socket.IO ASGI app (sio_app),
# NOT the bare "app" object -- otherwise the /socket.io debate endpoints
# never get mounted.
CMD ["uvicorn", "app.main:sio_app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
