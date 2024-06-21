import os
import uuid
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
from convert_altium import convert_kicad_to_ad
import cgi

from convert_glb import export_glb
from utils import CLI_SRV_PORT, FILE_SRV_PORT, OUT_DIR
from get_local_ip import get_local_ip

# Directory to save files
KICAD_IMG_HOME_PATH = "/home/kicad"
SERVER_URL = f"http://{get_local_ip()}:{FILE_SRV_PORT}/"  # Change the URL as per your server configuration

class FileUploadHandler(BaseHTTPRequestHandler):

    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    def do_POST(self):
        if self.path == '/convert_pcb_to_glb':
            self.handle_convert_pcb_to_glb()
        elif self.path == '/convert_ad_to_kicad':
            self.handle_convert_ad_to_kicad()
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def handle_convert_pcb_to_glb(self):
        self._set_headers()
        content_length = int(self.headers['Content-Length'])
        json_data = self.rfile.read(content_length)
        try:
            json_obj = json.loads(json_data)
            file_content = json_obj.get('pcb_content', '')
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'Invalid JSON data')
            return

        filename = str(uuid.uuid4()) + '.kicad_pcb'
        file_path = os.path.join(OUT_DIR, filename)

        try:
            with open(file_path, "w", encoding="gbk") as f:
                f.write(file_content)
        except UnicodeEncodeError:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(file_content.encode("utf-8", errors="ignore").decode("utf-8"))

        glb_file_path = export_glb(file_path)

        if glb_file_path:
            glb_filename = os.path.basename(glb_file_path)
            response_data = {
                'url': SERVER_URL + glb_filename
            }
            self.wfile.write(json.dumps(response_data).encode())
        else:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b'Error converting to GLB')

    def handle_convert_ad_to_kicad(self):
        content_type, pdict = cgi.parse_header(self.headers['content-type'])
        if content_type == 'multipart/form-data':
            pdict['boundary'] = bytes(pdict['boundary'], 'utf-8')
            form = cgi.parse_multipart(self.rfile, pdict)
            files = form.get('files')
            files_names = form.get('file_names')

            if not files:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"No files provided")
                return

            saved_files = []

            for idx, fn in enumerate(files_names):
                file_path = os.path.join(OUT_DIR, fn)
                with open(file_path, 'wb') as output_file:
                    output_file.write(files[idx])
                saved_files.append(file_path)

            converted_file_url = []
            for file_path in saved_files:
                converted_file_path = convert_kicad_to_ad(file_path)
                converted_file_url.append(f'{SERVER_URL}{os.path.basename(converted_file_path)}')

            self._set_headers()
            response = {"message": "Files successfully uploaded", "files": converted_file_url}
            self.wfile.write(bytes(json.dumps(response), 'utf-8'))
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Content-Type must be multipart/form-data")

def run_server(port=CLI_SRV_PORT):
    server_address = ('', port)
    httpd = HTTPServer(server_address, FileUploadHandler)
    print(f'Starting server on port {port}')
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
