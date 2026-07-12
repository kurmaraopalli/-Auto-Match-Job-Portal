// MatchBoard Controller - Frontend logic and Client-Side Recalculation

// Global State
let originalProfile = null;
let activeProfile = null;
let originalJobs = [];
let filteredJobs = [];
let activeTab = 'all';

// Constants for Client-Side Matching
const JUNIOR_KEYWORDS = [/\bjunior\b/i, /\bintern\b/i, /\bfresher\b/i, /\btrainee\b/i, /\bentry-level\b/i, /\bassociate developer\b/i];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

// Fetch Resume Profile and Match Jobs
async function loadData() {
    try {
        // Load candidate profile
        const profileRes = await fetch('../../data/resume_profile.json');
        if (!profileRes.ok) throw new Error('Failed to load resume profile');
        originalProfile = await profileRes.json();
        activeProfile = JSON.parse(JSON.stringify(originalProfile)); // Deep copy

        // Load jobs (this will be the processed latest_jobs.json if it exists, otherwise fall back to raw)
        let jobsRes;
        try {
            jobsRes = await fetch('../../data/latest_jobs.json');
            if (!jobsRes.ok) throw new Error('latest_jobs.json not available');
        } catch (e) {
            console.warn('latest_jobs.json not found, falling back to raw scraped_jobs.json');
            jobsRes = await fetch('../../data/scraped_jobs.json');
        }
        
        if (!jobsRes.ok) throw new Error('Failed to load job listings');
        originalJobs = await jobsRes.json();

        // If for some reason scores are missing, calculate them client-side immediately
        if (originalJobs.length > 0 && originalJobs[0].match_score === undefined) {
            calculateMatchesClientSide();
        }

        renderProfile();
        populateDomainDropdown();
        applyFiltersAndSort();
        updateStats();

    } catch (error) {
        console.error('Initialization Error:', error);
        document.getElementById('job-cards-container').innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-triangle-exclamation text-coral"></i>
                <h3>Initialization Error</h3>
                <p>${error.message}. Ensure you have run the scraper and matching scripts locally first.</p>
            </div>
        `;
    }
}

// Setup Interactive Elements
function setupEventListeners() {
    // Inputs
    document.getElementById('search-input').addEventListener('input', applyFiltersAndSort);
    document.getElementById('domain-filter').addEventListener('change', applyFiltersAndSort);
    
    const thresholdSlider = document.getElementById('match-threshold');
    thresholdSlider.addEventListener('input', (e) => {
        document.getElementById('threshold-val').textContent = `${e.target.value}%`;
        applyFiltersAndSort();
    });
    
    document.getElementById('sort-select').addEventListener('change', applyFiltersAndSort);
    document.getElementById('reset-filters-btn').addEventListener('click', resetFilters);

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            const targetBtn = e.currentTarget;
            targetBtn.classList.add('active');
            activeTab = targetBtn.dataset.filter;
            applyFiltersAndSort();
        });
    });

    // Profile Editor Modal
    const editBtn = document.getElementById('edit-profile-btn');
    const modal = document.getElementById('profile-modal');
    const modalOverlay = document.getElementById('profile-modal-overlay');
    const closeBtns = document.querySelectorAll('.close-modal-btn, #cancel-modal-btn');
    const saveBtn = document.getElementById('save-profile-btn');

    editBtn.addEventListener('click', openProfileEditor);
    closeBtns.forEach(btn => btn.addEventListener('click', () => {
        modal.classList.remove('open');
        modalOverlay.classList.remove('open');
    }));
    saveBtn.addEventListener('click', saveAndRecalculateProfile);

    // Detail Drawer Overlay
    const drawerOverlay = document.getElementById('details-overlay');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const drawer = document.getElementById('details-drawer');
    
    const closeDrawer = () => {
        drawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
    };
    
    drawerOverlay.addEventListener('click', closeDrawer);
    closeDrawerBtn.addEventListener('click', closeDrawer);
}

// Populate Domain dropdown filter
function populateDomainDropdown() {
    const select = document.getElementById('domain-filter');
    
    // Extract unique domains from the dataset
    const domains = new Set();
    originalJobs.forEach(job => {
        if (job.domain) domains.add(job.domain);
    });
    
    // Sort and populate
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        select.appendChild(option);
    });
}

// Render active profile details on sidebar
function renderProfile() {
    if (!activeProfile) return;
    
    document.getElementById('profile-name').textContent = activeProfile.name;
    document.getElementById('profile-title').textContent = activeProfile.title;
    document.getElementById('profile-experience').textContent = `${activeProfile.experience_years}+ Years Experience`;
    document.getElementById('profile-summary-text').textContent = activeProfile.summary;
    
    // Skill tags
    renderSkillCategoryTags('profile-backend-tags', activeProfile.skills.backend_and_systems);
    renderSkillCategoryTags('profile-ai-tags', activeProfile.skills.ai_ml_and_automation);
    renderSkillCategoryTags('profile-cloud-tags', activeProfile.skills.cloud_and_devops);
}

function renderSkillCategoryTags(elementId, skillList) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    if (!skillList || skillList.length === 0) {
        container.innerHTML = '<span class="text-muted" style="font-size:0.75rem">None</span>';
        return;
    }
    skillList.forEach(skill => {
        const tag = document.createElement('span');
        tag.className = 'skill-tag';
        tag.textContent = skill;
        container.appendChild(tag);
    });
}

// Open profile modal with active values
function openProfileEditor() {
    if (!activeProfile) return;
    
    document.getElementById('edit-name').value = activeProfile.name;
    document.getElementById('edit-title').value = activeProfile.title;
    document.getElementById('edit-experience').value = activeProfile.experience_years;
    document.getElementById('edit-location').value = activeProfile.contact.location;
    document.getElementById('edit-summary').value = activeProfile.summary;
    
    document.getElementById('edit-skills-backend').value = activeProfile.skills.backend_and_systems.join(', ');
    document.getElementById('edit-skills-ai').value = activeProfile.skills.ai_ml_and_automation.join(', ');
    document.getElementById('edit-skills-cloud').value = activeProfile.skills.cloud_and_devops.join(', ');
    
    document.getElementById('profile-modal').classList.add('open');
    document.getElementById('profile-modal-overlay').classList.add('open');
}

// Process modal data & trigger recalculation
function saveAndRecalculateProfile() {
    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Recalculating...';
    saveBtn.disabled = true;

    // Simulate small computational delay for wow effect
    setTimeout(() => {
        // Collect edited values
        activeProfile.name = stripOrEmpty(document.getElementById('edit-name').value);
        activeProfile.title = stripOrEmpty(document.getElementById('edit-title').value);
        activeProfile.experience_years = parseInt(document.getElementById('edit-experience').value) || 0;
        activeProfile.contact.location = stripOrEmpty(document.getElementById('edit-location').value);
        activeProfile.summary = stripOrEmpty(document.getElementById('edit-summary').value);

        activeProfile.skills.backend_and_systems = parseCommaSeparated(document.getElementById('edit-skills-backend').value);
        activeProfile.skills.ai_ml_and_automation = parseCommaSeparated(document.getElementById('edit-skills-ai').value);
        activeProfile.skills.cloud_and_devops = parseCommaSeparated(document.getElementById('edit-skills-cloud').value);

        // Run browser-side vector mapping
        calculateMatchesClientSide();

        // Refresh view
        renderProfile();
        applyFiltersAndSort();
        updateStats();

        // Close modal
        document.getElementById('profile-modal').classList.remove('open');
        document.getElementById('profile-modal-overlay').classList.remove('open');
        
        // Reset button state
        saveBtn.innerHTML = '<i class="fa-solid fa-arrows-spin"></i> Save & Recalculate';
        saveBtn.disabled = false;
        
        // Visual notification
        showNotification("Match scores recalculated successfully!");
    }, 800);
}

// Safe string trimmer — avoids monkey-patching String.prototype
function stripOrEmpty(val) {
    return (val == null) ? '' : String(val).trim();
}

// HTML entity escaper to prevent XSS when injecting dynamic content into innerHTML
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function parseCommaSeparated(text) {
    if (!text) return [];
    return text.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
}

// Display simple clean visual notifications
function showNotification(msg) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '2rem';
    toast.style.right = '2rem';
    toast.style.background = 'var(--panel-surface-solid)';
    toast.style.color = 'var(--accent-green)';
    toast.style.border = '1px solid var(--accent-green)';
    toast.style.padding = '1rem 1.5rem';
    toast.style.borderRadius = '10px';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
    toast.style.zIndex = 1000;
    toast.style.fontSize = '0.875rem';
    toast.style.fontWeight = '600';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '0.5rem';
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${msg}`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s ease';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ------------------------------------------------------------------
// BROWSER-BASED MATCHING ENGINE (SIMULATES Python Tfidf + Overlap)
// ------------------------------------------------------------------
function calculateMatchesClientSide() {
    console.log("[JS Engine] Starting browser-based matching run...");
    
    // Flatten candidate skills
    const candidateSkills = [];
    Object.values(activeProfile.skills).forEach(arr => {
        candidateSkills.push(...arr);
    });

    const candidateProfileText = `${activeProfile.title} ${activeProfile.summary} ${candidateSkills.join(' ')}`;
    const candidateTokens = tokenize(candidateProfileText);

    originalJobs = originalJobs.map(job => {
        const title = job.title.toLowerCase();
        
        // Skip junior filter rule
        const isJunior = JUNIOR_KEYWORDS.some(rx => rx.test(title));
        const isLowExperience = job.experience_required_years < 5;
        
        // Determine baseline fit check
        if (isJunior || (isLowExperience && title.includes('architect'))) {
            return null; // This will filter out
        }

        // Job details
        const jobSkills = (job.skills_required || []).map(s => s.toLowerCase());
        const jobText = `${job.title} ${job.description} ${jobSkills.join(' ')} ${job.domain}`;
        const jobTokens = tokenize(jobText);

        // 1. Term Frequency Similarity (Cosine-like token overlap)
        const simScore = calculateCosineSimilarity(candidateTokens, jobTokens);

        // 2. Direct Skill Overlap
        const matchedSkills = [];
        const missingSkills = [];
        
        candidateSkills.forEach(skill => {
            const skillLower = skill.toLowerCase();
            const descLower = job.description.toLowerCase();
            
            // Skill is match if in list or description contains word boundary match
            const regex = new RegExp('\\b' + escapeRegExp(skillLower) + '\\b', 'i');
            if (jobSkills.includes(skillLower) || regex.test(descLower)) {
                matchedSkills.push(skill);
            }
        });

        // Track missing skills (skills requested in job but not possessed by candidate)
        (job.skills_required || []).forEach(js => {
            if (!candidateSkills.some(cs => cs.toLowerCase() === js.toLowerCase())) {
                missingSkills.push(js);
            }
        });

        // Combined Score: 40% TF Overlap + 60% Skills Overlap
        const skillsMatchRatio = matchedSkills.length / Math.max(jobSkills.length, 1);
        const finalScore = (simScore * 0.4) + (skillsMatchRatio * 0.6);
        const percentageScore = Math.min(Math.max(Math.round(finalScore * 100), 25), 98);

        // Determine match level
        let matchCategory = "Low Match";
        if (percentageScore >= 75) {
            matchCategory = "High Match";
        } else if (percentageScore >= 55) {
            matchCategory = "Medium Match";
        }

        return {
            ...job,
            match_score: percentageScore,
            match_category: matchCategory,
            matched_skills: matchedSkills,
            missing_skills: missingSkills.slice(0, 5)
        };
    }).filter(job => job !== null && job.match_score >= 40); // Keep only matching non-junior jobs
}

// Simple English tokenization
function tokenize(text) {
    if (!text) return {};
    const words = text.toLowerCase()
        .replace(/[^a-z0-9\s\.\-#+]/g, ' ')
        .split(/\s+/);
    
    const freqs = {};
    const stopwords = ['the', 'is', 'at', 'which', 'on', 'in', 'and', 'a', 'an', 'to', 'for', 'with', 'we', 'are', 'you', 'our', 'of', 'or', 'our', 'by', 'as'];
    
    words.forEach(word => {
        if (word.length > 1 && !stopwords.includes(word)) {
            freqs[word] = (freqs[word] || 0) + 1;
        }
    });
    return freqs;
}

// Compute Cosine Similarity between word frequency maps
function calculateCosineSimilarity(vecA, vecB) {
    const vocab = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    vocab.forEach(term => {
        const valA = vecA[term] || 0;
        const valB = vecB[term] || 0;
        dotProduct += valA * valB;
        normA += valA * valA;
        normB += valB * valB;
    });
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ------------------------------------------------------------------
// FILTERS & UI RENDERING
// ------------------------------------------------------------------
function applyFiltersAndSort() {
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    const domainFilter = document.getElementById('domain-filter').value;
    const minThreshold = parseInt(document.getElementById('match-threshold').value) || 40;
    const sortVal = document.getElementById('sort-select').value;
    
    filteredJobs = originalJobs.filter(job => {
        // Tab filter
        if (activeTab === 'high' && job.match_category !== 'High Match') return false;
        if (activeTab === 'medium' && job.match_category !== 'Medium Match') return false;
        if (activeTab === 'low' && job.match_category !== 'Low Match') return false;

        // Min Score Threshold
        if (job.match_score < minThreshold) return false;

        // Domain filter
        if (domainFilter !== 'all' && job.domain !== domainFilter) return false;

        // Search text query
        if (searchQuery) {
            const matchesSearch = 
                job.title.toLowerCase().includes(searchQuery) ||
                job.company.toLowerCase().includes(searchQuery) ||
                job.description.toLowerCase().includes(searchQuery) ||
                (job.skills_required || []).some(s => s.toLowerCase().includes(searchQuery));
            if (!matchesSearch) return false;
        }

        return true;
    });

    // Apply Sorting
    filteredJobs.sort((a, b) => {
        if (sortVal === 'score-desc') {
            return b.match_score - a.match_score;
        } else if (sortVal === 'date-desc') {
            return new Date(b.posted_date) - new Date(a.posted_date);
        } else if (sortVal === 'experience-asc') {
            return a.experience_required_years - b.experience_required_years;
        } else if (sortVal === 'company-asc') {
            return a.company.localeCompare(b.company);
        }
        return 0;
    });

    renderJobCards();
    updateStatsPill();
}

// Reset match settings filters
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('domain-filter').value = 'all';
    document.getElementById('match-threshold').value = 50;
    document.getElementById('threshold-val').textContent = '50%';
    document.getElementById('sort-select').value = 'score-desc';
    
    applyFiltersAndSort();
}

function updateStatsPill() {
    const pill = document.getElementById('active-filters-pill');
    const domainVal = document.getElementById('domain-filter').value;
    const searchVal = document.getElementById('search-input').value;
    const minThreshold = document.getElementById('match-threshold').value;

    let text = `Showing ${filteredJobs.length} matches`;
    
    const filters = [];
    if (domainVal !== 'all') filters.push(domainVal.split(' ')[0]);
    if (searchVal) filters.push(`"${searchVal}"`);
    if (minThreshold > 40) filters.push(`>=${minThreshold}% match`);
    
    if (filters.length > 0) {
        text += ` matching filters: ${filters.join(' | ')}`;
    } else {
        text += ` (unfiltered)`;
    }
    pill.textContent = text;
}

function updateStats() {
    document.getElementById('stat-total-jobs').textContent = originalJobs.length;
    
    const highMatches = originalJobs.filter(j => j.match_category === 'High Match').length;
    document.getElementById('stat-high-matches').textContent = highMatches;
    
    const sum = originalJobs.reduce((acc, job) => acc + job.match_score, 0);
    const avg = originalJobs.length > 0 ? Math.round(sum / originalJobs.length) : 0;
    document.getElementById('stat-avg-score').textContent = `${avg}%`;

    // Counts for tabs
    document.getElementById('count-all').textContent = originalJobs.length;
    document.getElementById('count-high').textContent = highMatches;
    document.getElementById('count-medium').textContent = originalJobs.filter(j => j.match_category === 'Medium Match').length;
    document.getElementById('count-low').textContent = originalJobs.filter(j => j.match_category === 'Low Match').length;
}

// Render the job cards in dashboard
function renderJobCards() {
    const container = document.getElementById('job-cards-container');
    container.innerHTML = '';

    if (filteredJobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-briefcase"></i>
                <h3>No Matching Positions Found</h3>
                <p>Try adjusting your search criteria, reducing the minimum match threshold, or editing your resume skills.</p>
            </div>
        `;
        return;
    }

    filteredJobs.forEach((job, index) => {
        const card = document.createElement('div');
        
        let matchClass = 'low-match';
        let accentColor = 'var(--accent-yellow)';
        let accentGlow = 'var(--accent-yellow-glow)';
        let accentBorder = 'rgba(245, 158, 11, 0.2)';
        
        if (job.match_category === 'High Match') {
            matchClass = 'high-match';
            accentColor = 'var(--accent-green)';
            accentGlow = 'var(--accent-green-glow)';
            accentBorder = 'rgba(16, 185, 129, 0.2)';
        } else if (job.match_category === 'Medium Match') {
            matchClass = 'medium-match';
            accentColor = 'var(--accent-blue)';
            accentGlow = 'var(--accent-blue-glow)';
            accentBorder = 'rgba(59, 130, 246, 0.2)';
        }

        card.className = `job-card ${matchClass}`;
        card.style.animationDelay = `${index * 0.05}s`;
        
        // Highlight first 4 matched skills
        const displayMatched = (job.matched_skills || []).slice(0, 4);
        const displayUnmatched = (job.skills_required || [])
            .filter(s => !displayMatched.some(dm => dm.toLowerCase() === s.toLowerCase()))
            .slice(0, 3);

        let skillsHtml = '';
        displayMatched.forEach(skill => {
            skillsHtml += `<span class="matched-skill"><i class="fa-solid fa-circle-check"></i> ${escapeHtml(skill)}</span>`;
        });
        displayUnmatched.forEach(skill => {
            skillsHtml += `<span class="unmatched-skill">${escapeHtml(skill)}</span>`;
        });

        card.innerHTML = `
            <div class="job-card-main">
                <div class="job-card-header">
                    <span class="job-company">${escapeHtml(job.company)}</span>
                    <i class="fa-solid fa-chevron-right text-muted" style="font-size:0.7rem"></i>
                    <span class="job-title" onclick="openJobDetails('${escapeHtml(job.job_id)}')">${escapeHtml(job.title)}</span>
                </div>
                <div class="job-card-meta">
                    <span class="meta-item"><i class="fa-solid fa-network-wired"></i> ${escapeHtml(job.domain.split(' ')[0])}</span>
                    <span class="meta-item"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(job.location)}</span>
                    <span class="meta-item"><i class="fa-solid fa-briefcase"></i> ${job.experience_required_years}+ yrs</span>
                    <span class="meta-item"><i class="fa-solid fa-wallet"></i> ${escapeHtml(job.salary_range.split(' - ')[0])}</span>
                </div>
                <div class="job-card-skills">
                    ${skillsHtml}
                </div>
            </div>
            
            <div class="job-card-score">
                <div class="score-circle" style="--accent-color: ${accentColor}; --percentage: ${job.match_score * 3.6}deg">
                    <span class="score-value">${job.match_score}%</span>
                </div>
                <span class="match-badge" style="--accent-color: ${accentColor}; --accent-glow: ${accentGlow}; --accent-border: ${accentBorder}">${escapeHtml(job.match_category)}</span>
                <button class="apply-btn" onclick="window.open('${escapeHtml(job.apply_url)}', '_blank')" style="--accent-green: ${accentColor}; --accent-green-glow: ${accentGlow}">Apply</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Open slide-out drawer with full details
window.openJobDetails = function(jobId) {
    const job = originalJobs.find(j => j.job_id === jobId);
    if (!job) return;

    const drawer = document.getElementById('details-drawer');
    const overlay = document.getElementById('details-overlay');
    const content = document.getElementById('drawer-content');

    let matchColor = 'var(--accent-yellow)';
    let matchGlow = 'var(--accent-yellow-glow)';
    if (job.match_category === 'High Match') {
        matchColor = 'var(--accent-green)';
        matchGlow = 'var(--accent-green-glow)';
    } else if (job.match_category === 'Medium Match') {
        matchColor = 'var(--accent-blue)';
        matchGlow = 'var(--accent-blue-glow)';
    }

    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
            <div>
                <h3 class="drawer-title">${escapeHtml(job.title)}</h3>
                <p class="drawer-company">${escapeHtml(job.company)}</p>
            </div>
            <div class="score-circle" style="--accent-color: ${matchColor}; --percentage: ${job.match_score * 3.6}deg; flex-shrink: 0;">
                <span class="score-value">${job.match_score}%</span>
            </div>
        </div>

        <div class="drawer-meta-list">
            <div class="drawer-meta-item">
                <i class="fa-solid fa-network-wired"></i>
                <span><strong>Domain:</strong> ${escapeHtml(job.domain)}</span>
            </div>
            <div class="drawer-meta-item">
                <i class="fa-solid fa-location-dot"></i>
                <span><strong>Location:</strong> ${escapeHtml(job.location)}</span>
            </div>
            <div class="drawer-meta-item">
                <i class="fa-solid fa-briefcase"></i>
                <span><strong>Required Experience:</strong> ${job.experience_required_years}+ years</span>
            </div>
            <div class="drawer-meta-item">
                <i class="fa-solid fa-wallet"></i>
                <span><strong>Salary Estimate:</strong> ${escapeHtml(job.salary_range)}</span>
            </div>
            <div class="drawer-meta-item">
                <i class="fa-solid fa-calendar-day"></i>
                <span><strong>Posted Date:</strong> ${escapeHtml(job.posted_date)}</span>
            </div>
        </div>

        <div class="drawer-section">
            <h4>Profile Fit Match Analysis</h4>
            <div class="analysis-cards">
                <div class="analysis-card">
                    <span class="analysis-card-title card-green">
                        <i class="fa-solid fa-circle-check"></i> Matched Skills (${job.matched_skills.length})
                    </span>
                    <div class="tags-container">
                        ${job.matched_skills.map(s => `<span class="matched-skill" style="font-size:0.75rem">${escapeHtml(s)}</span>`).join('') || '<span class="text-muted" style="font-size:0.75rem">No matching skills</span>'}
                    </div>
                </div>
                
                <div class="analysis-card">
                    <span class="analysis-card-title card-red">
                        <i class="fa-solid fa-circle-xmark"></i> Missing/Required (${job.missing_skills.length})
                    </span>
                    <div class="tags-container">
                        ${job.missing_skills.map(s => `<span class="unmatched-skill" style="font-size:0.75rem">${escapeHtml(s)}</span>`).join('') || '<span class="text-muted" style="font-size:0.75rem">No missing requirements</span>'}
                    </div>
                </div>
            </div>
        </div>

        <div class="drawer-section">
            <h4>Detailed Job Description</h4>
            <p class="drawer-description">${escapeHtml(job.description)}</p>
        </div>

        <div class="drawer-apply-row">
            <a href="${escapeHtml(job.apply_url)}" target="_blank" class="apply-btn drawer-apply-btn" style="--accent-green: ${matchColor}; --accent-green-glow: ${matchGlow}">
                <i class="fa-solid fa-paper-plane"></i> Apply on Company Portal
            </a>
        </div>
    `;

    overlay.classList.add('open');
    drawer.classList.add('open');
};
