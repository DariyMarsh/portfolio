import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');
const status = document.querySelector('.filter-status');
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');
let query = '';
// Store the year, not its changing index in the search-filtered chart.
let selectedYear = null;
const colors = d3.scaleOrdinal(d3.schemeTableau10);
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

function searchMatches() {
    return projects.filter(project =>
        Object.values(project).join('\n').toLowerCase().includes(query.toLowerCase())
    );
}

function selectYear(year) {
    selectedYear = selectedYear === year ? null : year;
    update();
}

function renderPieChart(projectsGiven) {
    const data = d3.rollups(projectsGiven, group => group.length, project => String(project.year))
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => d3.ascending(a.label, b.label));
    const arcs = d3.pie().sort(null).value(d => d.value)(data);
    // Keyed joins update existing controls without duplicating them or losing focus.
    svg.selectAll('path').data(arcs, d => d.data.label).join('path')
        .attr('d', arcGenerator)
        .attr('fill', d => colors(d.data.label))
        .classed('selected', d => d.data.label === selectedYear)
        .attr('role', 'button').attr('tabindex', 0)
        .attr('aria-label', d => `${d.data.label}: ${d.data.value} projects`)
        .attr('aria-pressed', d => String(d.data.label === selectedYear))
        .on('click', (event, d) => selectYear(d.data.label))
        .on('keydown', (event, d) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectYear(d.data.label);
            }
        });
    const items = legend.selectAll('li').data(data, d => d.label).join(enter => {
        const li = enter.append('li').attr('class', 'legend-item');
        const button = li.append('button').attr('type', 'button');
        button.append('span').attr('class', 'swatch').attr('aria-hidden', 'true');
        button.append('span').attr('class', 'year-label');
        button.append('em');
        return li;
    }).style('--color', d => colors(d.label))
        .classed('selected', d => d.label === selectedYear);
    items.select('button').attr('aria-pressed', d => String(d.label === selectedYear))
        .attr('aria-label', d => `${d.label}: ${d.value} projects`)
        .on('click', (event, d) => selectYear(d.label));
    items.select('.year-label').text(d => d.label);
    items.select('em').text(d => `(${d.value})`);
}

function update() {
    const matches = searchMatches();
    // Both controls share one filtering pipeline, fixing the lab's final pitfall.
    const visible = selectedYear === null ? matches
        : matches.filter(project => String(project.year) === selectedYear);
    renderProjects(visible, projectsContainer, 'h2');
    projectsTitle.textContent = `${visible.length} Projects`;
    status.textContent = selectedYear === null
        ? `${visible.length} projects match your search.`
        : `${visible.length} projects in ${selectedYear}. Select the year again to clear the filter.`;
    // Keep the search-matching years available to switch or deselect a year.
    renderPieChart(matches);
    if (selectedYear !== null && !matches.some(p => String(p.year) === selectedYear)) {
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.textContent = 'Clear year filter';
        clear.addEventListener('click', () => { selectedYear = null; update(); });
        status.append(' ', clear);
    }
}

if (Array.isArray(projects)) {
    colors.domain([...new Set(projects.map(p => String(p.year)))].sort());
    searchInput.addEventListener('input', event => { query = event.target.value; update(); });
    update();
} else {
    searchInput.disabled = true;
    projectsContainer.textContent = 'Projects could not be loaded. Please try again later.';
}
