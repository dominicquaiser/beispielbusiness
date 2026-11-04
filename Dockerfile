# Statische Website beispielbusiness.de auf Basis von nginx (Alpine)
FROM nginx:1.30-alpine

LABEL org.opencontainers.image.title="beispielbusiness.de" \
      org.opencontainers.image.description="Statische Test- und Scraping-Sandbox der fiktiven Beispielbusiness GmbH"

# Standardkonfiguration und -inhalte des Images entfernen
RUN rm -f /etc/nginx/conf.d/default.conf \
 && rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/nginx.conf
COPY . /usr/share/nginx/html/

# Konfigurationsdatei nicht als Webinhalt ausliefern, Rechte vereinheitlichen, Konfiguration prüfen
RUN rm -f /usr/share/nginx/html/nginx.conf \
 && find /usr/share/nginx/html -type d -exec chmod 755 {} + \
 && find /usr/share/nginx/html -type f -exec chmod 644 {} + \
 && nginx -t

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
