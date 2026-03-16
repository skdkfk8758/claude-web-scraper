#!/usr/bin/env python3
"""
Scrapling bridge script.
Receives JSON input via stdin, performs fetch/parse, returns JSON via stdout.

Input format:
{
  "url": "https://example.com",
  "fields": {"title": ".product-name::text", "price": ".price::text"},
  "adaptive": false,
  "stealth": "auto",
  "html": null  // optional: if provided, skip fetching and just parse
}

Output format:
{
  "html": "<html>...</html>",
  "data": [{"title": "...", "price": "..."}],
  "url": "https://example.com",
  "fetcherUsed": "Fetcher"
}
"""

import json
import sys
import re


def parse_selector(raw: str) -> tuple[str, str | None]:
    """Parse CSS::text or CSS::attr(name) pseudo-selectors."""
    text_match = re.match(r'^(.+?)::text$', raw)
    if text_match:
        return text_match.group(1), 'text'

    attr_match = re.match(r'^(.+?)::attr\((.+?)\)$', raw)
    if attr_match:
        return attr_match.group(1), f'attr:{attr_match.group(2)}'

    return raw, None


def extract_value(element, pseudo: str | None):
    """Extract text, attribute, or HTML from an element."""
    if pseudo == 'text':
        return element.text.strip() if element.text else None
    if pseudo and pseudo.startswith('attr:'):
        attr_name = pseudo[5:]
        return element.attrib.get(attr_name)
    return element.text.strip() if element.text else None


def main():
    try:
        raw_input = sys.stdin.read()
        config = json.loads(raw_input)

        url = config['url']
        fields = config.get('fields', {})
        adaptive = config.get('adaptive', False)
        stealth = config.get('stealth', 'auto')
        provided_html = config.get('html')

        fetcher_used = 'none'
        html_content = provided_html

        if not html_content:
            # Determine fetcher
            if stealth == 'cloudflare':
                from scrapling import StealthyFetcher
                page = StealthyFetcher.fetch(url, headless=True, disable_resources=True)
                fetcher_used = 'StealthyFetcher'
            elif stealth == 'off':
                from scrapling import Fetcher
                page = Fetcher.get(url)
                fetcher_used = 'Fetcher'
            else:  # auto
                try:
                    from scrapling import Fetcher
                    page = Fetcher.get(url)
                    fetcher_used = 'Fetcher'
                except Exception:
                    from scrapling import StealthyFetcher
                    page = StealthyFetcher.fetch(url, headless=True, disable_resources=True)
                    fetcher_used = 'StealthyFetcher'

            html_content = page.html_content if hasattr(page, 'html_content') else str(page)

            # Use Scrapling's built-in selectors if fields provided
            if fields and hasattr(page, 'css'):
                data = []
                first_field_key = list(fields.keys())[0]
                selector, pseudo = parse_selector(fields[first_field_key])

                elements = page.css(selector)
                if adaptive and hasattr(page, 'css'):
                    elements = page.css(selector, auto_save=True)

                if len(elements) > 1:
                    # Multiple items
                    for el in elements:
                        row = {}
                        for key, sel_str in fields.items():
                            sel, ps = parse_selector(sel_str)
                            found = el.css(sel)
                            if found:
                                row[key] = extract_value(found[0], ps)
                            else:
                                row[key] = None
                        data.append(row)
                else:
                    row = {}
                    for key, sel_str in fields.items():
                        sel, ps = parse_selector(sel_str)
                        found = page.css(sel)
                        row[key] = extract_value(found[0], ps) if found else None
                    data.append(row)

                result = {
                    'html': html_content,
                    'data': data,
                    'url': url,
                    'fetcherUsed': fetcher_used,
                }
                print(json.dumps(result, ensure_ascii=False))
                return

        # If HTML was provided or no fields, just return HTML
        result = {
            'html': html_content,
            'data': [],
            'url': url,
            'fetcherUsed': fetcher_used,
        }
        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        error_result = {
            'error': str(e),
            'url': config.get('url', 'unknown') if 'config' in dir() else 'unknown',
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(0)  # Don't exit with error code; let TS handle it


if __name__ == '__main__':
    main()
