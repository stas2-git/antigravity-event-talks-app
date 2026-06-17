#!/usr/bin/env node

import readline from 'readline';

// Helper for Google-colored logo
const G = '\x1b[1m\x1b[94mG\x1b[0m';
const o1 = '\x1b[1m\x1b[91mo\x1b[0m';
const o2 = '\x1b[1m\x1b[93mo\x1b[0m';
const g = '\x1b[1m\x1b[94mg\x1b[0m';
const l = '\x1b[1m\x1b[92ml\x1b[0m';
const e = '\x1b[1m\x1b[91me\x1b[0m';
const googleLogo = `${G}${o1}${o2}${g}${l}${e}`;

// Displays a premium ASCII art header
function printHeader() {
  console.log('┌────────────────────────────────────────────────────────┐');
  console.log(`│             ${googleLogo}   N e w s   C L I   R e a d e r             │`);
  console.log('└────────────────────────────────────────────────────────┘');
  console.log();
}

// Shows help/usage instructions
function printHelp() {
  printHeader();
  console.log('Usage:');
  console.log('  google-news [options]');
  console.log();
  console.log('Options:');
  console.log('  -s, --source <source>   Specify the news source:');
  console.log('                            news     - Google News Top Stories (Default)');
  console.log('                            google   - News search about Google');
  console.log('                            official - Official news from Google Blog (The Keyword)');
  console.log('                            search   - Custom search query (requires -q/--query)');
  console.log('  -q, --query <query>     The search query (implies --source search)');
  console.log('  -l, --limit <limit>     The maximum number of stories to display (default: 10, max: 40)');
  console.log('  -h, --help              Show this help menu');
  console.log();
  console.log('Examples:');
  console.log('  node index.js                       # Launches interactive mode');
  console.log('  node index.js --source official     # Get official Google blog posts');
  console.log('  node index.js --query "Pixel 9"     # Search Google News for "Pixel 9"');
  console.log('  node index.js -s news -l 5          # Display top 5 stories');
  console.log();
}

// Clean CDATA blocks and decode HTML entities from RSS
function decodeHTMLEntities(text) {
  if (!text) return '';
  // Extract CDATA if present
  const cdataMatch = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  let cleanText = cdataMatch ? cdataMatch[1] : text;

  return cleanText
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&middot;/g, '·')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .trim();
}

// Simple XML/RSS regex parser
function parseRSS(xmlString, defaultSource = '') {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xmlString)) !== null) {
    const itemContent = match[1];
    
    const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    
    const title = titleMatch ? decodeHTMLEntities(titleMatch[1]) : 'No Title';
    const link = linkMatch ? linkMatch[1].trim() : '';
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
    let source = sourceMatch ? decodeHTMLEntities(sourceMatch[1]) : defaultSource;

    // For some official feeds, source might not be specified.
    // Try to guess from the link or fall back to default
    if (!source && link) {
      try {
        const url = new URL(link);
        source = url.hostname.replace('www.', '');
      } catch {
        source = 'Web';
      }
    }

    items.push({ title, link, pubDate, source });
  }
  return items;
}

// Formats absolute publication date into a clean relative date string
function formatRelativeTime(pubDateStr) {
  try {
    const pubDate = new Date(pubDateStr);
    const now = new Date();
    const diffMs = now - pubDate;
    if (isNaN(diffMs)) return pubDateStr;

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    return pubDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return pubDateStr;
  }
}

// Main fetch and print coordinator
async function fetchAndDisplay(options) {
  let url = '';
  let defaultSource = 'Google News';

  switch (options.source) {
    case 'news':
      url = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
      break;
    case 'google':
      url = 'https://news.google.com/rss/search?q=Google&hl=en-US&gl=US&ceid=US:en';
      break;
    case 'official':
      url = 'https://blog.google/rss/';
      defaultSource = 'Google Keyword Blog';
      break;
    case 'search':
      url = `https://news.google.com/rss/search?q=${encodeURIComponent(options.query)}&hl=en-US&gl=US&ceid=US:en`;
      break;
    default:
      url = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch RSS feed. Status code: ${res.status}`);
  }

  const xml = await res.text();
  const items = parseRSS(xml, defaultSource);
  const displayLimit = Math.min(options.limit, items.length);

  if (items.length === 0) {
    console.log('  \x1b[93mNo stories found.\x1b[0m');
    return;
  }

  console.log(`  Showing top \x1b[1m${displayLimit}\x1b[0m stories:\n`);

  for (let i = 0; i < displayLimit; i++) {
    const item = items[i];
    const indexStr = String(i + 1).padStart(2, ' ');
    const timeStr = formatRelativeTime(item.pubDate);
    
    console.log(`  \x1b[90m[${indexStr}]\x1b[0m  \x1b[1m\x1b[37m${item.title}\x1b[0m`);
    console.log(`        \x1b[90mSource:\x1b[0m \x1b[92m${item.source}\x1b[0m  \x1b[90m•  ${timeStr}\x1b[0m`);
    console.log(`        \x1b[90mLink:\x1b[0m   \x1b[4m\x1b[94m${item.link}\x1b[0m`);
    console.log();
  }
}

// Parses arguments and executes requested configuration
function parseArgs(args) {
  const options = {
    source: 'news',
    query: '',
    limit: 10,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--source' || arg === '-s') {
      options.source = args[++i];
    } else if (arg === '--query' || arg === '-q') {
      options.query = args[++i];
      options.source = 'search';
    } else if (arg === '--limit' || arg === '-l') {
      const parsedLimit = parseInt(args[++i], 10);
      if (!isNaN(parsedLimit)) {
        options.limit = parsedLimit;
      }
    }
  }

  return options;
}

// Interactive prompt loop when run without arguments
async function runInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  while (true) {
    console.clear();
    printHeader();
    console.log('  \x1b[1mSelect a News Source:\x1b[0m');
    console.log('  \x1b[94m1.\x1b[0m Google News - Top Stories (Global)');
    console.log('  \x1b[94m2.\x1b[0m Google News - News about Google');
    console.log('  \x1b[94m3.\x1b[0m Google Keyword Blog (Official Announcements)');
    console.log('  \x1b[94m4.\x1b[0m Custom News Search');
    console.log('  \x1b[94m5.\x1b[0m Exit');
    console.log();

    const choice = (await question('  Enter choice (1-5): ')).trim();

    if (choice === '5') {
      console.log('\n  Goodbye!');
      rl.close();
      process.exit(0);
    }

    let source = 'news';
    let query = '';

    if (choice === '1') {
      source = 'news';
    } else if (choice === '2') {
      source = 'google';
    } else if (choice === '3') {
      source = 'official';
    } else if (choice === '4') {
      source = 'search';
      query = (await question('\n  Enter search query: ')).trim();
      if (!query) {
        console.log('  \x1b[91mError: Search query cannot be empty!\x1b[0m');
        await question('\n  Press Enter to return to menu...');
        continue;
      }
    } else {
      console.log('\n  \x1b[91mInvalid choice. Please select 1-5.\x1b[0m');
      await question('\n  Press Enter to return to menu...');
      continue;
    }

    console.log('\n  Fetching news...\n');
    try {
      await fetchAndDisplay({ source, query, limit: 10 });
    } catch (err) {
      console.error(`\n  \x1b[91mError fetching news: ${err.message}\x1b[0m`);
    }

    await question('  Press Enter to return to main menu...');
  }
}

// Entry point
async function main() {
  const args = process.argv.slice(2);
  
  // If arguments are provided or stdout is not a terminal, run as non-interactive CLI
  if (args.length > 0 || !process.stdout.isTTY) {
    const options = parseArgs(args);
    
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    if (options.source === 'search' && !options.query) {
      console.error('\x1b[91mError: --query is required when source is "search".\x1b[0m');
      console.log('Run with -h or --help for instructions.');
      process.exit(1);
    }

    printHeader();
    try {
      await fetchAndDisplay(options);
    } catch (err) {
      console.error(`\x1b[91mError: ${err.message}\x1b[0m`);
      process.exit(1);
    }
  } else {
    // Interactive mode
    await runInteractive();
  }
}

main();
