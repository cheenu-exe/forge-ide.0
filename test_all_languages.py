#!/usr/bin/env python
"""Complete end-to-end test of Forge IDE compilation"""

import requests
import json
import time

def test_language(language: str, code: str, description: str) -> bool:
    """Test a language with code"""
    print(f"\n{'='*60}")
    print(f"Testing {description}")
    print(f"{'='*60}")
    
    data = {
        'language': language,
        'code': code,
        'stdin': '',
        'timeLimit': 5
    }
    
    try:
        response = requests.post('http://localhost:8000/api/execute', json=data, timeout=10)
        result = response.json()
        
        print(f"Status: {result['status']}")
        print(f"Exit Code: {result['exitCode']}")
        print(f"Execution Time: {result['executionTime']}ms")
        
        if result['stdout']:
            print(f"Output:\n{result['stdout']}")
        if result['stderr']:
            print(f"Error:\n{result['stderr']}")
        if result['compilationOutput']:
            print(f"Compilation Output:\n{result['compilationOutput']}")
            
        return result['status'] == 'success'
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False

# Test Python (MUST work - Python is installed)
test_language('python', 
    'print("Hello, World!")\nprint("Python is working!")',
    "Python Basic Print")

# Test with stdin
test_language('python',
    'n = int(input())\nprint(f"Number: {n}")',
    "Python with stdin")

# Test C++ (will fail if no compiler)
test_language('cpp',
    '#include <bits/stdc++.h>\nusing namespace std;\nint main() { cout << "Hello" << endl; return 0; }',
    "C++ (may fail if g++ not installed)")

print(f"\n{'='*60}")
print("Test complete!")
print(f"{'='*60}")
