import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Shared with the brush handlers, which run outside renderScatterPlot().
let xScale;
let yScale;

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    return data;
}

function processCommits(data) {
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            const first = lines[0];
            const { author, date, time, timezone, datetime } = first;
            const ret = {
                id: commit,
                url: 'https://github.com/DariyMarsh/portfolio/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            // Keep the raw lines available without cluttering console output.
            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false,
                writable: false,
                configurable: false,
            });

            return ret;
        });
}

function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    function addStat(labelHtml, value) {
        const item = dl.append('div');
        item.append('dt').html(labelHtml);
        item.append('dd').text(value);
    }

    const fileLengths = d3.rollups(
        data,
        (v) => d3.max(v, (d) => d.line),
        (d) => d.file,
    );
    const averageFileLength = d3.mean(fileLengths, (d) => d[1]);

    const workByPeriod = d3.rollups(
        data,
        (v) => v.length,
        (d) => d.datetime.toLocaleString('en', { dayPeriod: 'short' }),
    );
    // dayPeriod gives phrases like "in the evening"; keep just "evening".
    const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0].replace(/^(in the|at) /, '');

    const workByDay = d3.rollups(
        data,
        (v) => v.length,
        (d) => d.datetime.toLocaleString('en', { weekday: 'long' }),
    );
    const maxDay = d3.greatest(workByDay, (d) => d[1])?.[0];

    addStat('Total <abbr title="Lines of code">LOC</abbr>', data.length);
    addStat('Total commits', commits.length);
    addStat('Files', d3.group(data, (d) => d.file).size);
    addStat('Avg file length', `${Math.round(averageFileLength)} lines`);
    addStat('Longest line', `${d3.max(data, (d) => d.length)} chars`);
    addStat('Max depth', d3.max(data, (d) => d.depth));
    addStat('Most active time', maxPeriod ?? '—');
    addStat('Most active day', maxDay ?? '—');
}

function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
    time.textContent = commit.datetime?.toLocaleString('en', { timeStyle: 'short' });
    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    const offset = 12;
    // Flip to the other side of the cursor near the right/bottom edges.
    const { width, height } = tooltip.getBoundingClientRect();
    let left = event.clientX + offset;
    let top = event.clientY + offset;
    if (left + width > window.innerWidth) left = event.clientX - width - offset;
    if (top + height > window.innerHeight) top = event.clientY - height - offset;
    tooltip.style.left = `${Math.max(0, left)}px`;
    tooltip.style.top = `${Math.max(0, top)}px`;
}

function hourColor(hour) {
    // Blue at night, orange around midday.
    const daylight = (1 - Math.cos((hour / 24) * 2 * Math.PI)) / 2;
    return d3.interpolateRgb('#4a6fd1', '#f28e2b')(daylight);
}

function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('role', 'img')
        .attr('aria-label', 'Scatterplot of commits by date and time of day')
        .style('overflow', 'visible');

    xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    // Gridlines go first so they sit behind the axes and dots.
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
    gridlines.selectAll('.tick line').attr('stroke', (d) => hourColor(d));

    // Fewer ticks than the default so date labels don't collide.
    const xAxis = d3.axisBottom(xScale).ticks(8);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 30]);

    // Draw big dots first so small ones stay on top and remain hoverable.
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', (event) => {
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });

    createBrushSelector(svg, commits);
}

function isCommitSelected(selection, commit) {
    if (!selection) {
        return false;
    }
    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection, commits) {
    const selectedCommits = selection
        ? commits.filter((d) => isCommitSelected(selection, d))
        : [];

    const countElement = document.querySelector('#selection-count');
    const count = selectedCommits.length;
    countElement.textContent = `${count || 'No'} commit${count === 1 ? '' : 's'} selected`;

    return selectedCommits;
}

function renderLanguageBreakdown(selection, commits) {
    const selectedCommits = selection
        ? commits.filter((d) => isCommitSelected(selection, d))
        : [];
    const container = document.getElementById('language-breakdown');

    container.innerHTML = '';
    if (selectedCommits.length === 0) {
        return;
    }

    const lines = selectedCommits.flatMap((d) => d.lines);
    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type,
    );

    for (const [language, count] of breakdown) {
        const formatted = d3.format('.1~%')(count / lines.length);
        const item = document.createElement('div');
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = language;
        dd.textContent = `${count} lines (${formatted})`;
        item.append(dt, dd);
        container.append(item);
    }
}

function createBrushSelector(svg, commits) {
    function brushed(event) {
        const selection = event.selection;
        svg.selectAll('.dots circle').classed('selected', (d) =>
            isCommitSelected(selection, d),
        );
        renderSelectionCount(selection, commits);
        renderLanguageBreakdown(selection, commits);
    }

    svg.call(d3.brush().on('start brush end', brushed));

    // The brush overlay catches mouse events; move the dots back above it.
    svg.selectAll('.dots, .overlay ~ *').raise();
}

const data = await loadData();
const commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
