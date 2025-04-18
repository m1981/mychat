#!/usr/bin/env python3
import json
import sys
import argparse
import re
from collections import defaultdict

def extract_human_prompts(json_data):
    """Extract all human prompts from the GitHub Copilot chat JSON data."""
    prompts = []

    for conv_id, conversation in json_data.get("conversations", {}).items():
        for message in conversation.get("chatHistory", []):
            if "request_message" in message and message["request_message"].strip():
                prompt_data = {
                    "prompt": message["request_message"],
                    "request_id": message.get("request_id", ""),
                    "conversation_id": conv_id,
                    "timestamp": message.get("timestamp", "")
                }

                # Try to extract timestamp from conversation if not in message
                if not prompt_data["timestamp"] and "lastInteractedAtIso" in conversation:
                    prompt_data["timestamp"] = conversation["lastInteractedAtIso"]

                prompts.append(prompt_data)

    return prompts

def group_prompts_by_conversation(prompts):
    """Group prompts by conversation ID."""
    grouped = defaultdict(list)

    for prompt in prompts:
        grouped[prompt["conversation_id"]].append(prompt)

    # Sort prompts within each conversation by timestamp if available
    for conv_id in grouped:
        grouped[conv_id].sort(key=lambda x: x.get("timestamp", ""))

    return grouped

def extract_meaningful_content(text):
    """
    Extract meaningful content from a prompt, keeping only alphanumeric characters,
    spaces, and line breaks (\r\n).
    """
    # Remove code blocks (text between triple backticks)
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)

    # Remove inline code (text between single backticks)
    text = re.sub(r'`.*?`', '', text)

    # Keep only alphanumeric characters, spaces, and line breaks
    # First, replace \r\n with a special marker
    text = text.replace('\r\n', '<<CRLF>>')
    text = text.replace('\n', '<<LF>>')

    # Remove non-alphanumeric characters (except spaces)
    text = re.sub(r'[^a-zA-Z0-9 <<CRLF>><<LF>>]', '', text)

    # Restore line breaks
    text = text.replace('<<CRLF>>', '\r\n')
    text = text.replace('<<LF>>', '\n')

    # Remove extra spaces
    text = re.sub(r' +', ' ', text)

    # Remove spaces at the beginning of lines
    text = re.sub(r'(\r\n|\n) +', r'\1', text)

    # Remove empty lines
    text = re.sub(r'(\r\n|\n){2,}', r'\1', text)

    return text.strip()

def process_prompts(input_file, output_file=None):
    """Process prompts from input file, group by conversation, and extract meaningful content."""
    try:
        # Load data from file or stdin
        if input_file == '-':
            json_data = json.load(sys.stdin)
        else:
            with open(input_file, 'r', encoding='utf-8') as f:
                json_data = json.load(f)

        # If input is already a list of prompts
        if isinstance(json_data, list) and all('prompt' in item for item in json_data):
            prompts = json_data
        else:
            # Extract prompts from GitHub Copilot chat JSON
            prompts = extract_human_prompts(json_data)

        # Group prompts by conversation
        grouped_prompts = group_prompts_by_conversation(prompts)

        # Process each prompt to extract meaningful content
        result = {}
        for conv_id, conv_prompts in grouped_prompts.items():
            result[conv_id] = []
            for prompt in conv_prompts:
                meaningful_content = extract_meaningful_content(prompt["prompt"])
                result[conv_id].append({
                    "original_prompt": prompt["prompt"],
                    "meaningful_content": meaningful_content,
                    "request_id": prompt["request_id"],
                    "timestamp": prompt.get("timestamp", "")
                })

        # Output the result
        output_json = json.dumps(result, indent=2)
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(output_json)
            print(f"Processed prompts saved to {output_file}")
        else:
            print(output_json)

        return result

    except json.JSONDecodeError:
        print(f"Error: Input is not a valid JSON file", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print(f"Error: File {input_file} not found", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Process and analyze GitHub Copilot chat prompts")
    parser.add_argument("input_file", help="Input JSON file path or '-' for stdin")
    parser.add_argument("--output", "-o", help="Output file path (default: stdout)")

    args = parser.parse_args()

    process_prompts(args.input_file, args.output)

if __name__ == "__main__":
    main()
