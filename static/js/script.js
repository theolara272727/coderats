const CONFIG = {
    HANDLES: [
            "theo272727",

    ],
    MIN_TIMESTAMP: 1765831804,
    FETCH_COUNT: 10000,

    // New Exponential Params
    EXP_BASE: 1.8,
    EXP_SCALE: 400,
    LOG_MULTIPLIER: 2.5 
};

const DOM = {
    ranking: document.getElementById('ranking'),
    topProblem: document.getElementById('top_problem'),
    lastSolvedTable: document.getElementById('last_solved_table'),
    limitSelect: document.getElementById('table_limit'),
    modal: document.getElementById('user_modal'),
    modalTitle: document.getElementById('modal_title'),
    modalTable: document.getElementById('modal_table'),
    modalScore: document.getElementById('modal_score'),
    modalCount: document.getElementById('modal_count'),
    modalMax: document.getElementById('modal_max_rating')
};

// GLOBAL STATE to allow interactivity without re-calc
let STATE = {
    usersData: {},
    globalHistory: [],
    bestProblem: {}
};

// --- MATH LOGIC ---
// Formula: (Base ^ (Rating / 400)) * (1 + 1.5 * ln(count)) * 100


const calculateScore = (rating, count) => {
    if (count <= 0) return 0;
    // Logarithmic decay applied to quantity of problems at this specific rating
    return rating * (1 + Math.log(count) * CONFIG.LOG_MULTIPLIER);
};

const calculateMarginalScore = (rating, newCount) => {
    const current = calculateScore(rating, newCount);
    const previous = calculateScore(rating, newCount - 1);
    return current - previous;
};

// --- API & PROCESSING ---
async function fetchUserSubmissions(handle) {
    const url = `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=${CONFIG.FETCH_COUNT}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        return data.status === "OK" ? data.result : [];
    } catch (e) {
        console.error(`Fetch error ${handle}:`, e);
        return [];
    }
}

async function processData() {
    if (CONFIG.HANDLES.length === 0) return;

    const responses = await Promise.all(CONFIG.HANDLES.map(h => fetchUserSubmissions(h)));

    let bestProblem = { rating: 0, name: "N/A", handle: "-", tags: [] };

    CONFIG.HANDLES.forEach((handle, idx) => {
        // Reverse to process chronologically
        const subs = [...responses[idx]].reverse();
        const solvedSet = new Set();
        const ratingCounts = {};

        // Initialize User Object
        STATE.usersData[handle] = {
            handle,
            score: 0,
            solvedProblems: [], // Store specific objects for this user
            maxRating: 0
        };

        subs.forEach(sub => {
            if (sub.verdict !== "OK") return;

            const { name, rating } = sub.problem;

            if (solvedSet.has(name)) return;
            solvedSet.add(name);

            // Time Frame Check
            if (sub.creationTimeSeconds <= CONFIG.MIN_TIMESTAMP) return;
            if (rating === undefined) return;

            // Update Score Logic
            ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
            const points = calculateMarginalScore(rating, ratingCounts[rating]);

            STATE.usersData[handle].score += points;
            if(rating > STATE.usersData[handle].maxRating) {
                STATE.usersData[handle].maxRating = rating;
            }

            // Update Global Best (Time restricted)
            if (rating > bestProblem.rating) {
                bestProblem = { ...sub.problem, handle };
            }

            // Create Data Object
            const entry = {
                problem: sub.problem,
                handle: handle,
                creationTimeSeconds: sub.creationTimeSeconds,
                marginalPoints: points
            };

            // Push to Global History
            STATE.globalHistory.push(entry);

            // Push to User Specific History
            STATE.usersData[handle].solvedProblems.push(entry);
        });
    });

    STATE.bestProblem = bestProblem;
    // Sort Global History once
    STATE.globalHistory.sort((a, b) => b.creationTimeSeconds - a.creationTimeSeconds);
}

// --- RENDERING ---

function renderRanking() {
    DOM.ranking.innerHTML = '';
    const sortedUsers = Object.values(STATE.usersData).sort((a, b) => b.score - a.score);

    if (sortedUsers.length === 0) {
        DOM.ranking.textContent = "Nenhum dado ou handles não configurados.";
        return;
    }

    sortedUsers.forEach(user => {
        const div = document.createElement('div');
        div.className = 'item_container';
        div.onclick = () => openUserModal(user.handle); // Click Event
        div.innerHTML = `
            <div class="item_text">${escapeHtml(user.handle)}</div>
            <div class="item_score">${Math.round(user.score).toLocaleString()}</div>
        `;
        DOM.ranking.appendChild(div);
    });
}

function renderTopProblem() {
    const p = STATE.bestProblem;
    DOM.topProblem.innerHTML = `
        <b>Nome:</b> ${getProblemLinkHTML(p)}<br>
        <b>Rating:</b> ${p.rating}<br>
        <b>Feito por:</b> ${escapeHtml(p.handle)}<br>
        <b>Tags:</b>
    `;
    (p.tags || []).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        DOM.topProblem.appendChild(span);
    });
}

function renderLastSolvedTable() {
    const limit = parseInt(DOM.limitSelect.value);
    const dataSlice = STATE.globalHistory.slice(0, limit);

    DOM.lastSolvedTable.innerHTML = `
        <tr>
            <th>Problema</th> <th>Rating</th> <th>Data</th> <th>Feito por</th> <th>Pontuação</th>
        </tr>
    `;

    dataSlice.forEach(sub => {
        DOM.lastSolvedTable.appendChild(createRow(sub));
    });
}

// --- MODAL LOGIC ---

function openUserModal(handle) {
    const user = STATE.usersData[handle];
    if(!user) return;

    DOM.modalTitle.textContent = `Estatísticas: ${user.handle}`;
    DOM.modalScore.textContent = Math.round(user.score).toLocaleString();
    DOM.modalCount.textContent = user.solvedProblems.length;
    DOM.modalMax.textContent = user.maxRating;

    // Render User Specific Table
    DOM.modalTable.innerHTML = `<tr><th>Problema</th><th>Rating</th><th>Data</th><th>Pts</th></tr>`;

    // Sort user problems desc by time
    const userHistory = [...user.solvedProblems].sort((a,b) => b.creationTimeSeconds - a.creationTimeSeconds);

    userHistory.forEach(sub => {
        const row = document.createElement('tr');
        const dateStr = new Date(sub.creationTimeSeconds * 1000).toLocaleDateString('pt-BR');
        row.innerHTML = `
            <td>${getProblemLinkHTML(sub.problem)}</td>
            <td>${sub.problem.rating}</td>
            <td>${dateStr}</td>
            <td style='color:var(--highlight)'>+${sub.marginalPoints.toFixed(0)}</td>
        `;
        DOM.modalTable.appendChild(row);
    });

    DOM.modal.classList.add('active');
}

function closeModal() {
    DOM.modal.classList.remove('active');
}

// Close modal if clicking outside content
window.onclick = function(event) {
    if (event.target == DOM.modal) closeModal();
}

// --- UTILS ---

function createRow(sub) {
    const row = document.createElement('tr');
    const dateStr = new Date(sub.creationTimeSeconds * 1000).toLocaleDateString('pt-BR');
    row.innerHTML = `
        <td>${getProblemLinkHTML(sub.problem)}</td>
        <td>${sub.problem.rating}</td>
        <td>${dateStr}</td>
        <td>${escapeHtml(sub.handle)}</td>
        <td style='color: var(--highlight); font-weight: bold;'>+${sub.marginalPoints.toFixed(0)}</td>
    `;
    return row;
}

function getProblemLinkHTML(problem) {
    if (!problem.contestId || !problem.index) {
        return escapeHtml(problem.name);
    }
    const url = `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`;
    return `<a href="${url}" target="_blank" class="problem-link">${escapeHtml(problem.name)}</a>`;
}

function escapeHtml(text) {
    if (!text) return "-";
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// --- INIT ---
(async function init() {
    try {
        await processData();
        renderRanking();
        renderTopProblem();
        renderLastSolvedTable();
    } catch (e) {
        console.error("Critical Error:", e);
        DOM.ranking.textContent = "Erro. Verifique Console.";
    }
})();