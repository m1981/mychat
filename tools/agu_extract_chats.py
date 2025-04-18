#!/usr/bin/env python3
import json
import sys
import argparse
from datetime import datetime

def extract_human_prompts(json_data, include_timestamps=False, include_conversation_id=False, output_format="text"):
    """
    Extract all human prompts from the GitHub Copilot chat JSON data.

    Parameters:
    - json_data: The parsed JSON data
    - include_timestamps: Whether to include timestamps with each prompt
    - include_conversation_id: Whether to include conversation IDs
    - output_format: Output format ("text", "json", or "csv")

    Returns:
    - A list of dictionaries containing the extracted prompts and metadata
    """
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

def format_output(prompts, include_timestamps, include_conversation_id, output_format):
    """Format the extracted prompts according to the specified output format."""
    if output_format == "json":
        # For JSON output, we can include all metadata
        return json.dumps(prompts, indent=2)

    elif output_format == "csv":
        # For CSV, create a header and rows
        header = ["prompt"]
        if include_timestamps:
            header.append("timestamp")
        if include_conversation_id:
            header.append("conversation_id")
        header.append("request_id")

        csv_lines = [",".join([f'"{h}"' for h in header])]

        for p in prompts:
            # Properly escape quotes in CSV by doubling them
            escaped_prompt = p["prompt"].replace('"', '""')
            row = [f'"{escaped_prompt}"']

            if include_timestamps:
                row.append(f'"{p["timestamp"]}"')
            if include_conversation_id:
                row.append(f'"{p["conversation_id"]}"')
            row.append(f'"{p["request_id"]}"')
            csv_lines.append(",".join(row))

        return "\n".join(csv_lines)

    else:  # Default to text format
        # For text format, just output the prompts with optional metadata
        lines = []
        for p in prompts:
            line_parts = []

            if include_timestamps and p["timestamp"]:
                line_parts.append(f"[{p['timestamp']}]")

            if include_conversation_id:
                line_parts.append(f"(Conversation: {p['conversation_id']})")

            line_parts.append(p["prompt"])
            lines.append(" ".join(line_parts))

        return "\n\n".join(lines)

def main():
    parser = argparse.ArgumentParser(description="Extract human prompts from GitHub Copilot chat JSON")
    parser.add_argument("input_file", help="Input JSON file path")
    parser.add_argument("--output", "-o", help="Output file path (default: stdout)")
    parser.add_argument("--format", "-f", choices=["text", "json", "csv"], default="text",
                        help="Output format (default: text)")
    parser.add_argument("--timestamps", "-t", action="store_true",
                        help="Include timestamps with prompts")
    parser.add_argument("--conversation-id", "-c", action="store_true",
                        help="Include conversation IDs with prompts")

    args = parser.parse_args()

    try:
        with open(args.input_file, 'r', encoding='utf-8') as f:
            json_data = json.load(f)

        prompts = extract_human_prompts(json_data)
        formatted_output = format_output(
            prompts,
            args.timestamps,
            args.conversation_id,
            args.format
        )

        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(formatted_output)
            print(f"Extracted {len(prompts)} prompts to {args.output}")
        else:
            print(formatted_output)

    except json.JSONDecodeError:
        print(f"Error: {args.input_file} is not a valid JSON file", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print(f"Error: File {args.input_file} not found", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
