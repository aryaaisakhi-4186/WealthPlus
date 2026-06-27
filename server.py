import http.server
import socketserver
import socket
import os

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent caching for development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/write-file':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                import json
                data = json.loads(post_data.decode('utf-8'))
                
                filename = data.get('filename')
                content = data.get('content')
                
                # Check for secure filename (restrict to repository root files only)
                clean_filename = os.path.basename(filename)
                allowed_files = ['index.html', 'app.js', 'style.css', 'sindhu_v1.js', 'server.py', 'README.md', 'firebase-config.js']
                
                if clean_filename not in allowed_files:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(b'{"error": "Access denied: file not in allowed list"}')
                    return
                
                filepath = os.path.join(os.getcwd(), clean_filename)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"status": "success"}')
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}"}}'.encode('utf-8'))
        else:
            # Fall back to default handler for other POST requests
            super().do_POST()

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == '__main__':
    web_dir = os.path.dirname(os.path.realpath(__file__))
    os.chdir(web_dir)
    
    local_ip = get_local_ip()
    
    print("=================================================================")
    print("                  WEALTH PLUS DEVELOPMENT SERVER                 ")
    print("=================================================================")
    print(f"Serving static files from: {web_dir}")
    print(f"Server is running on PORT: {PORT}\n")
    print(f"  --> Laptop/PC URL: http://localhost:{PORT}")
    print(f"  --> Mobile Phone URL: http://{local_ip}:{PORT}")
    print("=================================================================")
    print("Press Ctrl+C to stop the server.")
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped. Goodbye!")
