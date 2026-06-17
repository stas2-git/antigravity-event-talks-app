// Application State
let allReleases = [];
let filteredReleases = [];
let activeCategory = 'all';
let searchText = '';
let selectedReleaseId = null;
let readReleases = new Set(JSON.parse(localStorage.getItem('readReleases') || '[]'));

// DOM Elements
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const categoryFilters = document.getElementById('category-filters');
const mobileCategoryFilter = document.getElementById('mobile-category-filter');
const releasesContainer = document.getElementById('releases-container');
const activeFiltersInfo = document.getElementById('active-filters-info');
const filteredCountText = document.getElementById('filtered-count');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const toastNotification = document.getElementById('toast-notification');

// Stats DOM Elements
const statTotal = document.getElementById('stat-total');
const statFeature = document.getElementById('stat-feature');
const statBreaking = document.getElementById('stat-breaking');
const statChange = document.getElementById('stat-change');
const statIssue = document.getElementById('stat-issue');
const statsPanel = document.getElementById('stats-panel');

// Modal DOM Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const submitTweetBtn = document.getElementById('submit-tweet-btn');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchReleases(false); // Initial load (uses cache if available)
});

// Setup All UI Event Listeners
function setupEventListeners() {
    // Refresh Button Click
    refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });

    // Search Input Real-time Filtering
    searchInput.addEventListener('input', (e) => {
        searchText = e.target.value.toLowerCase().strip();
        clearSearchBtn.style.display = searchText.length > 0 ? 'block' : 'none';
        applyFilters();
    });

    // Clear Search Input
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchText = '';
        clearSearchBtn.style.display = 'none';
        applyFilters();
    });

    // Desktop Category Filter Buttons
    const filterButtons = categoryFilters.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            activeCategory = button.getAttribute('data-filter');
            // Sync with mobile selector
            mobileCategoryFilter.value = activeCategory;
            applyFilters();
        });
    });

    // Mobile Category Select Dropdown
    mobileCategoryFilter.addEventListener('change', (e) => {
        activeCategory = e.target.value;
        
        // Sync with desktop buttons
        const filterButtons = categoryFilters.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            if (btn.getAttribute('data-filter') === activeCategory) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        applyFilters();
    });

    // Sidebar Widgets Filter Interaction
    statsPanel.addEventListener('click', (e) => {
        const targetCard = e.target.closest('.stat-card, .stat-item');
        if (!targetCard) return;
        
        const filterVal = targetCard.getAttribute('data-filter');
        activeCategory = filterVal;
        
        // Sync mobile dropdown
        mobileCategoryFilter.value = filterVal;
        
        // Sync desktop buttons
        const filterButtons = categoryFilters.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            if (btn.getAttribute('data-filter') === filterVal) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        applyFilters();
        
        // Scroll to main content controls bar if on mobile
        if (window.innerWidth <= 1024) {
            document.querySelector('.controls-bar').scrollIntoView({ behavior: 'smooth' });
        }
    });

    // Reset Filters Button Link
    resetFiltersBtn.addEventListener('click', resetAllFilters);

    // Modal Close Triggers
    closeModalBtn.addEventListener('click', hideTweetModal);
    cancelTweetBtn.addEventListener('click', hideTweetModal);
    
    // Close modal if clicked outside card
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            hideTweetModal();
        }
    });

    // Textarea character limit dynamic display and button disabling
    tweetTextarea.addEventListener('input', () => {
        const len = tweetTextarea.value.length;
        charCounter.textContent = `${len} / 280`;
        
        if (len > 280) {
            charCounter.parentElement.classList.add('warning');
            submitTweetBtn.disabled = true;
            submitTweetBtn.style.opacity = '0.5';
            submitTweetBtn.style.cursor = 'not-allowed';
        } else {
            charCounter.parentElement.classList.remove('warning');
            submitTweetBtn.disabled = false;
            submitTweetBtn.style.opacity = '1';
            submitTweetBtn.style.cursor = 'pointer';
        }
    });

    // Modal Submit Tweet Button
    submitTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value.trim();
        if (text.length > 0 && text.length <= 280) {
            const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(tweetUrl, '_blank', 'noopener,noreferrer');
            hideTweetModal();
            showToast("Opening Twitter / X share intent...");
        }
    });

    // Theme Switch toggle
    const themeCheckbox = document.getElementById('theme-checkbox');
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        themeCheckbox.checked = true;
    }
    
    themeCheckbox.addEventListener('change', () => {
        if (themeCheckbox.checked) {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
            showToast("Switched to Light Theme");
        } else {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
            showToast("Switched to Dark Theme");
        }
    });

    // Export CSV Button Click
    const exportCsvBtn = document.getElementById('export-csv-btn');
    exportCsvBtn.addEventListener('click', () => {
        exportToCSV();
    });

    // Scroll to Top Button Action
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    const appMain = document.querySelector('.app-main');
    
    const handleScroll = (element) => {
        if (element.scrollTop > 300) {
            scrollTopBtn.classList.add('show');
        } else {
            scrollTopBtn.classList.remove('show');
        }
    };
    
    appMain.addEventListener('scroll', () => handleScroll(appMain));
    window.addEventListener('scroll', () => handleScroll(document.documentElement));
    
    scrollTopBtn.addEventListener('click', () => {
        appMain.scrollTo({ top: 0, behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Add polyfill/helper for older browsers/environments just in case
if (!String.prototype.strip) {
    String.prototype.strip = function() {
        return this.trim();
    };
}

// Reset all filters back to default state
function resetAllFilters() {
    searchInput.value = '';
    searchText = '';
    clearSearchBtn.style.display = 'none';
    
    activeCategory = 'all';
    mobileCategoryFilter.value = 'all';
    
    const filterButtons = categoryFilters.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        if (btn.getAttribute('data-filter') === 'all') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    applyFilters();
}

// Fetch Release Notes from Server API
function fetchReleases(forceRefresh = false) {
    // UI Loading state
    refreshBtn.disabled = true;
    refreshBtn.classList.add('loading');
    renderSkeletons();
    
    let url = '/api/releases';
    if (forceRefresh) {
        url += '?refresh=true';
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("HTTP network response error");
            }
            return response.json();
        })
        .then(data => {
            allReleases = data;
            updateDashboardStats();
            applyFilters();
            if (forceRefresh) {
                showToast("Feed refreshed with latest updates!");
            }
        })
        .catch(error => {
            console.error("Error fetching release notes:", error);
            showToast("Failed to load release notes. Using offline cached data.");
            
            // If fetching failed, try loading cache from state or render empty
            if (allReleases.length === 0) {
                renderEmptyState("Unable to fetch updates. Please verify your connection.");
            }
        })
        .finally(() => {
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('loading');
        });
}

// Render Loading Skeleton Cards
function renderSkeletons() {
    releasesContainer.innerHTML = `
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
    `;
}

// Render Empty State Screen
function renderEmptyState(message = "No updates matched your criteria.") {
    releasesContainer.innerHTML = `
        <div class="empty-state">
            <svg viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <h3>No Updates Found</h3>
            <p>${message}</p>
            <button onclick="resetAllFilters()" class="btn btn-secondary">Reset Filters</button>
        </div>
    `;
}

// Update Stats Panel Widgets in Sidebar
function updateDashboardStats() {
    statTotal.textContent = allReleases.length;
    
    const counts = {
        Feature: 0,
        Breaking: 0,
        Change: 0,
        Issue: 0,
        Announcement: 0
    };
    
    allReleases.forEach(item => {
        if (counts.hasOwnProperty(item.type)) {
            counts[item.type]++;
        } else {
            counts.Announcement++; // Fallback
        }
    });
    
    statFeature.textContent = counts.Feature;
    statBreaking.textContent = counts.Breaking;
    statChange.textContent = counts.Change;
    statIssue.textContent = counts.Issue;
}

// Filter release data based on category and search query
function applyFilters() {
    filteredReleases = allReleases.filter(item => {
        // Category Match
        const categoryMatch = (activeCategory === 'all' || item.type === activeCategory);
        
        // Search query match
        const searchMatch = !searchText || 
            item.text.toLowerCase().includes(searchText) || 
            item.type.toLowerCase().includes(searchText) || 
            item.date.toLowerCase().includes(searchText);
            
        return categoryMatch && searchMatch;
    });

    // Update Filter Summary Bar
    const isFiltered = activeCategory !== 'all' || searchText.length > 0;
    if (isFiltered) {
        activeFiltersInfo.style.display = 'flex';
        filteredCountText.textContent = filteredReleases.length;
    } else {
        activeFiltersInfo.style.display = 'none';
    }

    renderReleases();
}

// Output releases list inside container
function renderReleases() {
    releasesContainer.innerHTML = '';
    
    if (filteredReleases.length === 0) {
        renderEmptyState();
        return;
    }

    filteredReleases.forEach(item => {
        const card = document.createElement('article');
        const isRead = readReleases.has(item.id);
        card.className = `release-card ${selectedReleaseId === item.id ? 'selected' : ''} ${isRead ? 'read' : ''}`;
        card.setAttribute('data-id', item.id);
        
        // Apply category class to badge
        const badgeClass = `badge badge-${item.type.toLowerCase()}`;
        
        // Highlight searched text inside HTML tags context safely
        let displayContent = item.content;
        if (searchText) {
            try {
                const escapedSearch = escapeRegExp(searchText);
                const regex = new RegExp(`(${escapedSearch})(?![^<>]*>)`, 'gi');
                displayContent = displayContent.replace(regex, '<mark>$1</mark>');
            } catch (e) {
                console.error("Highlighting regex error:", e);
            }
        }
        
        card.innerHTML = `
            <div class="card-header">
                <div class="meta-group">
                    <span class="${badgeClass}">${item.type}</span>
                    <span class="card-date">${item.date}</span>
                </div>
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="card-link" title="Open official release notes page">
                    <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                </a>
            </div>
            <div class="card-content">
                ${displayContent}
            </div>
            <div class="card-footer">
                <button class="card-action-btn btn-read ${isRead ? 'is-read' : ''}" title="${isRead ? 'Mark as Unread' : 'Mark as Read'}">
                    <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                    <span>${isRead ? 'Read' : 'Mark Read'}</span>
                </button>
                <button class="card-action-btn btn-copy" title="Copy text to clipboard">
                    <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                    Copy
                </button>
                <button class="card-action-btn btn-tweet" title="Share this update on X / Twitter">
                    <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Tweet
                </button>
            </div>
        `;

        // Card Selection Event
        card.addEventListener('click', () => {
            const allCards = releasesContainer.querySelectorAll('.release-card');
            
            if (card.classList.contains('selected')) {
                card.classList.remove('selected');
                selectedReleaseId = null;
            } else {
                allCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedReleaseId = item.id;
            }
        });

        // Read/Unread Toggle Event
        const readBtn = card.querySelector('.btn-read');
        readBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid selecting card
            toggleReadStatus(item.id, card, readBtn);
        });

        // Copy Button Event
        const copyBtn = card.querySelector('.btn-copy');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid selecting card
            copyToClipboard(item);
        });

        // Tweet Button Event
        const tweetBtn = card.querySelector('.btn-tweet');
        tweetBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid selecting card
            showTweetModal(item);
        });

        releasesContainer.appendChild(card);
    });
}

// Copy update details to clipboard
function copyToClipboard(item) {
    const textToCopy = `[BigQuery Release - ${item.date}] (${item.type})\n${item.text}\nSource: ${item.link}`;
    
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            showToast("Copied to clipboard successfully!");
        })
        .catch(err => {
            console.error("Clipboard copy failed: ", err);
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            textArea.style.position = "fixed";  // Avoid scrolling to bottom
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                showToast("Copied to clipboard successfully!");
            } catch (err) {
                showToast("Failed to copy. Please manually copy the content.");
            }
            document.body.removeChild(textArea);
        });
}

// Display Toast Alert Notification
let toastTimeout;
function showToast(message) {
    clearTimeout(toastTimeout);
    toastNotification.textContent = message;
    toastNotification.classList.add('show');
    
    toastTimeout = setTimeout(() => {
        toastNotification.classList.remove('show');
    }, 3500);
}

// Display Tweet Customization Modal
function showTweetModal(item) {
    // Formulate a beautiful template tweet
    // Standard URL length is counted as 23 characters by Twitter.
    // Hashtags space: 26 characters
    // Maximum space for text message: 280 - 23 (url) - 26 (hashtags) - 3 (spacing/quotes) = 228 chars
    
    const tag = `#BigQuery`;
    const handle = `#GoogleCloud`;
    const header = `[${item.type}] BigQuery Update (${item.date}): `;
    
    // Calculate remaining characters for description excerpt
    const overheadLength = header.length + 3 + tag.length + 1 + handle.length + 1 + 23; // 23 is tweet short url len
    const maxExcerptLen = 280 - overheadLength - 5; // buffer
    
    let excerpt = item.text;
    if (excerpt.length > maxExcerptLen) {
        excerpt = excerpt.substring(0, maxExcerptLen) + "...";
    }
    
    const tweetText = `${header}"${excerpt}"\n\n${tag} ${handle}\n${item.link}`;
    
    tweetTextarea.value = tweetText;
    charCounter.textContent = `${tweetText.length} / 280`;
    
    if (tweetText.length >= 260) {
        charCounter.parentElement.classList.add('warning');
    } else {
        charCounter.parentElement.classList.remove('warning');
    }
    
    tweetModal.classList.add('show');
    tweetModal.setAttribute('aria-hidden', 'false');
    tweetTextarea.focus();
}

// Hide Tweet Customization Modal
function hideTweetModal() {
    tweetModal.classList.remove('show');
    tweetModal.setAttribute('aria-hidden', 'true');
}

// Export currently filtered releases to a CSV file
function exportToCSV() {
    if (filteredReleases.length === 0) {
        showToast("No release notes found to export.");
        return;
    }
    
    // CSV Header
    const headers = ["ID", "Date", "Type", "Link", "Content Plaintext"];
    
    // Construct CSV rows
    const csvRows = [
        headers.join(',')
    ];
    
    filteredReleases.forEach(item => {
        const formatField = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };
        
        const row = [
            formatField(item.id),
            formatField(item.date),
            formatField(item.type),
            formatField(item.link),
            formatField(item.text)
        ];
        
        csvRows.push(row.join(','));
    });
    
    // Generate download
    const csvContent = "\uFEFF" + csvRows.join("\n"); // Add UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `bigquery_release_notes_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${filteredReleases.length} updates to CSV!`);
}

// Regex escape helper function
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Toggle Read/Unread card state helper
function toggleReadStatus(id, cardElement, buttonElement) {
    if (readReleases.has(id)) {
        readReleases.delete(id);
        cardElement.classList.remove('read');
        buttonElement.classList.remove('is-read');
        buttonElement.querySelector('span').textContent = 'Mark Read';
        buttonElement.setAttribute('title', 'Mark as Read');
        showToast("Marked as Unread");
    } else {
        readReleases.add(id);
        cardElement.classList.add('read');
        buttonElement.classList.add('is-read');
        buttonElement.querySelector('span').textContent = 'Read';
        buttonElement.setAttribute('title', 'Mark as Unread');
        showToast("Marked as Read");
    }
    localStorage.setItem('readReleases', JSON.stringify(Array.from(readReleases)));
}
