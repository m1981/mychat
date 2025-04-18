#!/usr/bin/env python3
import base64
import json
import xml.etree.ElementTree as ET
import sys
import os
import argparse

def extract_json_from_xml(xml_file, output_file=None):
    """Extract base64-encoded JSON from XML and save to a file."""
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()

        # Find the CHAT_STATE entry
        for entry in root.findall(".//entry[@key='CHAT_STATE']"):
            if 'value' in entry.attrib:
                value = entry.attrib['value']

                # Try to decode if it's base64
                try:
                    decoded_bytes = base64.b64decode(value)
                    json_str = decoded_bytes.decode('utf-8')
                except:
                    # If not base64, assume it's already JSON
                    json_str = value

                # Validate and format JSON
                try:
                    json_data = json.loads(json_str)
                    formatted_json = json.dumps(json_data, indent=2)

                    # Write to file or stdout
                    if output_file:
                        with open(output_file, 'w', encoding='utf-8') as f:
                            f.write(formatted_json)
                        print(f"JSON extracted and saved to {output_file}")
                    else:
                        print(formatted_json)

                    return json_data
                except json.JSONDecodeError as e:
                    print(f"Error: Invalid JSON: {e}")
                    return None

        print("Error: No CHAT_STATE entry found in the XML file.")
        return None

    except Exception as e:
        print(f"Error processing file: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Extract JSON from XML")
    parser.add_argument("input_file", help="Input XML file path")
    parser.add_argument("output_file", nargs='?', help="Output file path (default: stdout)")
    args = parser.parse_args()

    try:
        tree = ET.parse(args.input_file)
        root = tree.getroot()

        # Find the CHAT_STATE entry
        for entry in root.findall(".//entry[@key='CHAT_STATE']"):
            if 'value' in entry.attrib:
                value = entry.attrib['value']
                try:
                    decoded_bytes = base64.b64decode(value)
                    json_str = decoded_bytes.decode('utf-8')
                except:
                    json_str = value

                json_data = json.loads(json_str)
                if args.output_file and args.output_file != '-':
                    with open(args.output_file, 'w', encoding='utf-8') as f:
                        json.dump(json_data, f)
                else:
                    json.dump(json_data, sys.stdout)
                return

        print("Error: No CHAT_STATE entry found", file=sys.stderr)
        sys.exit(1)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()