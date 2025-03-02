from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder='../assets', static_url_path='/assets')

@app.route('/')
def index():
    return send_from_directory('..', 'index.html')

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
