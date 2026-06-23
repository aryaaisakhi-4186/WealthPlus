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
