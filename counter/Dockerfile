FROM python:3.13-alpine

ENV PYTHONDONTWRITEBYTECODE=1

RUN addgroup -S counter && adduser -S -G counter counter \
  && mkdir -p /app /data/store \
  && chown -R counter:counter /data

COPY server.py /app/server.py

USER counter
WORKDIR /app
EXPOSE 8765

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "from urllib.request import urlopen; urlopen('http://127.0.0.1:8765/healthz', timeout=2).close()"

CMD ["python", "-u", "server.py"]
