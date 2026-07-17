#!/usr/bin/env python
"""Test backend API execution"""

import requests
import json

data = {
    'language': 'python',
    'code': 'print("Hello, World!")',
    'stdin': '',
    'timeLimit': 5
}

response = requests.post('http://localhost:8000/api/execute', json=data)
result = response.json()
print(json.dumps(result, indent=2))
