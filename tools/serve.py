"""Local dev server with caching disabled so edited modules always reload.

    python tools/serve.py [port]   (default 5791)
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCache(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


NoCache.extensions_map.update({".js": "text/javascript", ".mjs": "text/javascript"})

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5791
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCache) as httpd:
        print(f"H-Town Nights on http://localhost:{port}")
        httpd.serve_forever()
