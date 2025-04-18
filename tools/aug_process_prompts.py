#!/usr/bin/env python3
import argparse
import re
from collections import defaultdict
from aug_common import load_json_input, extract_human_prompts, save_json_output

def group_prompts_by_conversation(prompts):
    """Group prompts by conversation ID."""
    grouped = defaultdict(list)
    for prompt in prompts:
        grouped[prompt["conversation_id"]].append(prompt)
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

def main():
    parser = argparse.ArgumentParser(description="Process and analyze chat prompts")
    parser.add_argument("input_file", nargs='?', default='-',
                       help="Input JSON file path (default: stdin)")
    parser.add_argument("--output", "-o", help="Output file path (default: stdout)")
    args = parser.parse_args()

    json_data = load_json_input(args.input_file)
    prompts = extract_human_prompts(json_data) if not isinstance(json_data, list) else json_data
    grouped_prompts = group_prompts_by_conversation(prompts)

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

    save_json_output(result, args.output)

if __name__ == "__main__":
    main()
