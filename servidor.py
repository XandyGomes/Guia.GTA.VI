# -*- coding: utf-8 -*-
"""Servidor local do guia.  python servidor.py          -> só neste computador
                            python servidor.py celular  -> também para o celular no mesmo Wi-Fi"""
import functools, http.server, os, socket, sys, webbrowser

PASTA = os.path.dirname(os.path.abspath(__file__))
PORTA = 8060
CELULAR = 'celular' in sys.argv[1:]


class Pedido(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
                      '.webmanifest': 'application/manifest+json', '.css': 'text/css; charset=utf-8',
                      '.html': 'text/html; charset=utf-8'}

    def log_message(self, *a):
        pass

    def list_directory(self, path):
        self.send_error(404)


def ip_local():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        return s.getsockname()[0]
    except OSError:
        return '?'
    finally:
        s.close()


if __name__ == '__main__':
    try:
        srv = http.server.ThreadingHTTPServer(('0.0.0.0' if CELULAR else '127.0.0.1', PORTA),
                                              functools.partial(Pedido, directory=PASTA))
    except OSError:
        print(f'A porta {PORTA} já está em uso: o guia provavelmente já está aberto em http://localhost:{PORTA}')
        sys.exit(1)
    print(f'Guia aberto neste computador:  http://localhost:{PORTA}')
    if CELULAR:
        print(f'No celular (mesmo Wi-Fi):      http://{ip_local()}:{PORTA}')
    print('Deixe esta janela aberta enquanto usa. Para fechar: Ctrl+C.')
    if '--sem-navegador' not in sys.argv:
        webbrowser.open(f'http://localhost:{PORTA}')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
