import os
import re
import json
import logging
import urllib.parse
import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template, send_from_directory
from bs4 import BeautifulSoup

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder="static", template_folder="templates")

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "feed_cache.json"

def parse_feed_xml(xml_content):
    """
    Parses the BigQuery release notes XML feed and extracts individual updates
    within each day's entry.
    """
    try:
        # Atom feed namespace
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(xml_content)
        
        parsed_updates = []
        update_counter = 0

        # Loop through all entry elements
        for entry in root.findall('atom:entry', namespaces):
            title_elem = entry.find('atom:title', namespaces)
            date_str = title_elem.text.strip() if title_elem is not None else "Unknown Date"
            
            id_elem = entry.find('atom:id', namespaces)
            entry_id = id_elem.text.strip() if id_elem is not None else str(update_counter)
            
            updated_elem = entry.find('atom:updated', namespaces)
            timestamp = updated_elem.text.strip() if updated_elem is not None else ""
            
            link_elem = entry.find("atom:link[@rel='alternate']", namespaces)
            link = link_elem.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            content_elem = entry.find('atom:content', namespaces)
            html_content = content_elem.text if content_elem is not None else ""
            
            if not html_content:
                continue

            # Parse html content inside entry (which has multiple <h3> headings for update types)
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Group content by h3 headers
            current_type = None
            current_elements = []
            
            def add_current_update():
                nonlocal update_counter
                if current_type and current_elements:
                    # Construct HTML and text
                    body_html = "".join(str(el) for el in current_elements)
                    # Convert to text and clean it up
                    temp_soup = BeautifulSoup(body_html, 'html.parser')
                    # Ensure links in the parsed text are preserved or formatted nicely, and clean whitespace
                    body_text = temp_soup.get_text(separator=' ').strip()
                    body_text = re.sub(r'\s+', ' ', body_text)
                    
                    # Generate a unique ID for this specific sub-update
                    sanitized_type = re.sub(r'[^a-zA-Z0-9]', '', current_type)
                    unique_id = f"{entry_id}_{sanitized_type}_{update_counter}"
                    update_counter += 1

                    parsed_updates.append({
                        "id": unique_id,
                        "date": date_str,
                        "timestamp": timestamp,
                        "type": current_type,
                        "content": body_html,
                        "text": body_text,
                        "link": link
                    })

            # Iterate over BS elements
            for child in soup.contents:
                # If it's a Tag and name is h3
                if hasattr(child, 'name') and child.name == 'h3':
                    # Save the previous update
                    add_current_update()
                    # Reset for the new category
                    current_type = child.get_text().strip()
                    current_elements = []
                elif current_type:
                    current_elements.append(child)
                elif hasattr(child, 'name') and child.name is not None:
                    # If we don't have a category yet but there are elements, group as 'General'
                    current_type = "Announcement"
                    current_elements.append(child)
            
            # Save the final update for this entry
            add_current_update()

        return parsed_updates
    except Exception as e:
        logger.error(f"Error parsing XML feed: {e}", exc_info=True)
        return []

def get_release_notes(force_refresh=False):
    """
    Fetches and returns parsed release notes.
    Uses the local cache if refresh is not forced and cache is valid, or if fetch fails.
    """
    xml_data = None
    fetch_success = False

    if not force_refresh and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cached_data = json.load(f)
                logger.info("Serving from local cache file")
                return cached_data
        except Exception as e:
            logger.warning(f"Failed to read cache file: {e}")

    try:
        logger.info(f"Fetching release notes from {FEED_URL}...")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        xml_data = response.text
        fetch_success = True
    except Exception as e:
        logger.error(f"Failed to fetch XML feed: {e}")

    if fetch_success and xml_data:
        parsed_updates = parse_feed_xml(xml_data)
        if parsed_updates:
            # Write to cache
            try:
                with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                    json.dump(parsed_updates, f, ensure_ascii=False, indent=2)
                logger.info(f"Cached {len(parsed_updates)} updates successfully")
            except Exception as e:
                logger.warning(f"Failed to write to cache file: {e}")
            return parsed_updates

    # Fallback if fetch failed
    if os.path.exists(CACHE_FILE):
        try:
            logger.info("Fetch failed. Falling back to cache file.")
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Cache fallback failed: {e}")

    return []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    """API endpoint to get release notes. Supports ?refresh=true parameter."""
    from flask import request
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    releases = get_release_notes(force_refresh=force_refresh)
    return jsonify(releases)

if __name__ == '__main__':
    # Try fetching initial data on startup so it's ready
    try:
        get_release_notes(force_refresh=False)
    except Exception as e:
        logger.error(f"Initial feed fetch failed: {e}")
        
    logger.info("Starting BigQuery Release Notes Viewer server...")
    app.run(host='127.0.0.1', port=5000, debug=True)
