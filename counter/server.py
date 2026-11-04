"""Anonymer, persistenter Gesamtzähler für Seitenaufrufe."""

import json
import os
import sqlite3
from contextlib import closing
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DATABASE = os.environ.get("PAGEVIEWS_DB", "/data/store/pageviews.sqlite3")
PORT = int(os.environ.get("PORT", "8765"))


def connect():
    return sqlite3.connect(DATABASE, timeout=10)


def initialize():
    with closing(connect()) as database, database:
        database.execute(
            "CREATE TABLE IF NOT EXISTS counters "
            "(name TEXT PRIMARY KEY, total INTEGER NOT NULL)"
        )
        database.execute(
            "INSERT OR IGNORE INTO counters (name, total) VALUES ('pageviews', 0)"
        )


def increment():
    with closing(connect()) as database, database:
        database.execute(
            "UPDATE counters SET total = total + 1 WHERE name = 'pageviews'"
        )
        return database.execute(
            "SELECT total FROM counters WHERE name = 'pageviews'"
        ).fetchone()[0]


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
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/healthz":
            self.respond(200, b"ok\n")
        else:
            self.respond(404, b"Not found\n")

    def do_POST(self):
        if self.path != "/api/pageviews":
            self.respond(404, b"Not found\n")
            return
        if self.headers.get("X-Pageview") != "1":
            self.respond(403, b"Forbidden\n")
            return
        if self.headers.get("Content-Length") not in (None, "0") or self.headers.get(
            "Transfer-Encoding"
        ):
            self.respond(400, b"Request body not allowed\n")
            return
        try:
            total = increment()
        except sqlite3.Error:
            self.respond(503, b"Counter unavailable\n")
            return
        body = json.dumps({"pageviews": total}).encode("ascii")
        self.respond(200, body, "application/json; charset=utf-8")


if __name__ == "__main__":
    initialize()
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
