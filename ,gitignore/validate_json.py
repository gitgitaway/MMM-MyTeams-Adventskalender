import json
import sys

files = [
    'package.json',
    'package_lock.json'
]

for filename in files:
    try:
        with open(filename, 'r') as f:
            json.load(f)
        print(f'✓ {filename} is valid JSON')
    except json.JSONDecodeError as e:
        print(f'✗ {filename} has JSON syntax error: {e}')
        sys.exit(1)
    except Exception as e:
        print(f'✗ Error reading {filename}: {e}')
        sys.exit(1)

print('\nAll JSON files are valid!')
