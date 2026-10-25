import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function loadLatestProjects() {
    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) return;

    const projects = await fetchJSON('./lib/projects.json');
    if (Array.isArray(projects)) {
        renderProjects(projects.slice(0, 3), projectsContainer, 'h3');
    } else {
        projectsContainer.textContent = 'Projects could not be loaded. Please try again later.';
    }
}

async function loadProfileStats() {
    const profileStats = document.querySelector('#profile-stats');
    if (!profileStats) return;

    const githubData = await fetchGitHubData('DariyMarsh');
    const fields = [
        ['Public Repos', 'public_repos'],
        ['Public Gists', 'public_gists'],
        ['Followers', 'followers'],
        ['Following', 'following'],
    ];
    if (githubData && fields.every(([, key]) => Number.isFinite(githubData[key]))) {
        profileStats.innerHTML = `<dl>${fields.map(([label, key]) => `
            <div><dt>${label}</dt><dd>${githubData[key]}</dd></div>
        `).join('')}</dl>`;
    } else {
        profileStats.textContent = 'GitHub statistics are unavailable right now. Please try again later.';
    }
}

// Each section renders as soon as its own request finishes.
await Promise.all([loadLatestProjects(), loadProfileStats()]);
