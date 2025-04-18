#!/usr/bin/env python3
import base64
import json
import xml.etree.ElementTree as ET
import sys
import os

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

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python agu_extract.py <xml_file> [output_json_file]")
        sys.exit(1)

    xml_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    extract_json_from_xml(xml_file, output_file)
