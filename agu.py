#!/usr/bin/env python3
import base64
import json
import xml.etree.ElementTree as ET
import argparse
import os
from datetime import datetime
import sys

def create_backup(file_path):
    """Create a timestamped backup of the file."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.backup.{timestamp}"
    with open(file_path, 'rb') as src, open(backup_path, 'wb') as dst:
        dst.write(src.read())
    print(f"Backup created: {backup_path}")
    return backup_path

def encode_xml_file(file_path):
    """Encode JSON values in XML file to base64."""
    tree = ET.parse(file_path)
    root = tree.getroot()

    # Find all elements with 'value' attribute that might contain JSON
    for entry in root.findall(".//entry[@key='CHAT_STATE']"):
        if 'value' in entry.attrib:
            try:
                # Assume it's already JSON and encode it
                value = entry.attrib['value']
                # Only encode if it's not already encoded (simple heuristic)
                if value.startswith('{'):
                    encoded_value = base64.b64encode(value.encode('utf-8')).decode('utf-8')
                    entry.attrib['value'] = encoded_value
                    print("JSON content encoded successfully")
            except Exception as e:
                print(f"Warning: Could not encode value: {e}")

    tree.write(file_path, encoding='UTF-8', xml_declaration=True)
    print(f"File encoded and saved: {file_path}")

def decode_xml_file(file_path):
    """Decode base64 values in XML file to JSON."""
    tree = ET.parse(file_path)
    root = tree.getroot()

    # Find all elements with 'value' attribute that might contain base64
    for entry in root.findall(".//entry[@key='CHAT_STATE']"):
        if 'value' in entry.attrib:
            try:
                # Try to decode as base64
                value = entry.attrib['value']
                # Simple heuristic to check if it's base64 encoded
                if not value.startswith('{'):
                    decoded_bytes = base64.b64decode(value)
                    decoded_value = decoded_bytes.decode('utf-8')

                    # Validate it's proper JSON
                    json.loads(decoded_value)  # This will raise an exception if not valid JSON

                    entry.attrib['value'] = decoded_value
                    print("Base64 content decoded successfully to JSON")
            except Exception as e:
                print(f"Warning: Could not decode value: {e}")

    tree.write(file_path, encoding='UTF-8', xml_declaration=True)
    print(f"File decoded and saved: {file_path}")

def pretty_print_json(file_path):
    """Decode and pretty print the JSON content without modifying the file."""
    tree = ET.parse(file_path)
    root = tree.getroot()

    for entry in root.findall(".//entry[@key='CHAT_STATE']"):
        if 'value' in entry.attrib:
            value = entry.attrib['value']
            try:
                # Try direct JSON parsing first
                json_data = json.loads(value)
                print("JSON content found:")
            except json.JSONDecodeError:
                try:
                    # Try base64 decoding
                    decoded_bytes = base64.b64decode(value)
                    decoded_value = decoded_bytes.decode('utf-8')
                    json_data = json.loads(decoded_value)
                    print("Base64-encoded JSON content found:")
                except Exception as e:
                    print(f"Error: Could not parse content: {e}")
                    return

            # Pretty print the JSON
            print(json.dumps(json_data, indent=2))

def main():
    parser = argparse.ArgumentParser(description='Process XML files with base64-encoded JSON content')
    parser.add_argument('action', choices=['encode', 'decode', 'view'],
                        help='Action to perform: encode JSON to base64, decode base64 to JSON, or view JSON content')
    parser.add_argument('file', help='XML file to process')

    args = parser.parse_args()

    if not os.path.isfile(args.file):
        print(f"Error: File '{args.file}' not found!")
        sys.exit(1)

    if args.action == 'view':
        pretty_print_json(args.file)
    else:
        # Create backup before modifying
        create_backup(args.file)

        if args.action == 'encode':
            encode_xml_file(args.file)
        elif args.action == 'decode':
            decode_xml_file(args.file)

if __name__ == "__main__":
    main()
