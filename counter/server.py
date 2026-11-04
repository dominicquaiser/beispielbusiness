"""Anonymer, persistenter Gesamtzähler für alle HTTP-Anfragen an die Website.

nginx meldet jede Anfrage als Syslog-Datagramm an einen Unix-Socket, etwa
"<190>Nov  4 19:34:11 beispielbusiness: request" (siehe log_format in nginx.conf).
Außer der Uhrzeit im Syslog-Kopf, die hier verworfen wird, enthält es keine
Angaben zur Anfrage wie IP-Adresse oder Pfad. Der Dienst zählt die Meldungen im
Speicher, schreibt den Stand jede Sekunde und beim Beenden nach SQLite und
liefert ihn unter GET /api/requests aus.
"""

import json
import os
import signal
import socket
import sqlite3
import sys
import threading
import time
from contextlib import closing
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# Datenbank und Volume behalten ihre bisherigen Namen. Ein Stand des früheren
# Seitenaufrufzählers bleibt dort unter dem Namen "pageviews" unverändert.
DATABASE = os.environ.get("PAGEVIEWS_DB", "/data/store/pageviews.sqlite3")
SOCKET = os.environ.get("COUNTER_SOCKET", "/sockets/counter.sock")
PORT = int(os.environ.get("PORT", "8765"))
COUNTER = "requests"
# Jede Meldung endet mit dem Text aus log_format request_counter in nginx.conf.
MESSAGE_END = b": request"
FLUSH_INTERVAL = 1.0


def connect():
    return sqlite3.connect(DATABASE, timeout=10)


def load():
    with closing(connect()) as database, database:
        database.execute(
            "CREATE TABLE IF NOT EXISTS counters "
            "(name TEXT PRIMARY KEY, total INTEGER NOT NULL)"
        )
        database.execute(
            "INSERT OR IGNORE INTO counters (name, total) VALUES (?, 0)", (COUNTER,)
        )
        return database.execute(
            "SELECT total FROM counters WHERE name = ?", (COUNTER,)
        ).fetchone()[0]


def store(delta):
    with closing(connect()) as database, database:
        database.execute(
            "UPDATE counters SET total = total + ? WHERE name = ?", (delta, COUNTER)
        )


class Counter:
    def __init__(self, total):
        self.lock = threading.Lock()
        self.flush_lock = threading.Lock()
        self.total = total
        self.stored = total

    def increment(self):
        with self.lock:
            self.total += 1

    def value(self):
        with self.lock:
            return self.total

    def flush(self):
        # flush_lock verhindert, dass zwei Aufrufe denselben Zuwachs speichern.
        with self.flush_lock:
            with self.lock:
                delta = self.total - self.stored
            if delta:
                store(delta)
                self.stored += delta


def flush_periodically(counter):
    while True:
        time.sleep(FLUSH_INTERVAL)
        try:
            counter.flush()
        except sqlite3.Error as error:
            # Der Stand bleibt im Speicher und wird beim nächsten Versuch geschrieben.
            print(f"Zählerstand nicht gespeichert: {error}", file=sys.stderr)


def bind_socket():
    receiver = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
    try:
        os.unlink(SOCKET)
    except FileNotFoundError:
        pass
    receiver.bind(SOCKET)
    # nginx läuft in einem anderen Container unter einem anderen Benutzer.
    os.chmod(SOCKET, 0o666)
    return receiver


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Die Standardklasse würde hier die Client-IP protokollieren.
        pass

    def respond(self, status, body, content_type="text/plain; charset=utf-8"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/requests":
            body = json.dumps({"requests": self.server.counter.value()})
            self.respond(200, body.encode("ascii"), "application/json; charset=utf-8")
        elif self.path == "/healthz":
            self.respond(200, b"ok\n")
        else:
            self.respond(404, b"Not found\n")

    do_HEAD = do_GET


def main():
    # Socket zuerst anlegen: Meldungen warten dort, bis der Stand geladen ist.
    receiver = bind_socket()
    counter = Counter(load())

    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    server.counter = counter
    threading.Thread(target=server.serve_forever, daemon=True).start()
    threading.Thread(target=flush_periodically, args=(counter,), daemon=True).start()

    # docker stop sendet SIGTERM; der finally-Block speichert dann den letzten Stand.
    # Python führt den Handler erst aus, wenn recv() zurückkehrt, daher das Timeout.
    signal.signal(signal.SIGTERM, lambda signum, frame: sys.exit(0))
    receiver.settimeout(0.5)
    try:
        while True:
            try:
                message = receiver.recv(512)
            except TimeoutError:
                continue
            if message.endswith(MESSAGE_END):
                counter.increment()
    finally:
        counter.flush()


if __name__ == "__main__":
    main()
