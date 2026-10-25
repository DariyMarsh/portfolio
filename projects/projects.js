import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');

if (Array.isArray(projects)) {
    renderProjects(projects, projectsContainer, 'h2');
    projectsTitle.textContent = `${projects.length} Projects`;
} else {
    projectsContainer.textContent = 'Projects could not be loaded. Please try again later.';
}
