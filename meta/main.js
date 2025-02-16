let data = [];
let commits = d3.groups(data, (d) => d.commit);

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line), 
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    
    processCommits();
    displayStats();
    drawChart();  
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});

function processCommits() {
    commits = d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;
            let ret = {
                id: commit,
                url: 'https://github.com/vis-society/lab-7/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false, 
                writable: false, 
                configurable: false 
            });

            return ret;
        });
}

function displayStats() {
    processCommits();

    const statsContainer = d3.select('#stats').append('dl').attr('class', 'stats');

    function addStat(title, value) {
        const statItem = statsContainer.append('div').attr('class', 'stat-item');
        statItem.append('dt').text(title);
        statItem.append('dd').text(value);
    }

    addStat('Total LOC', data.length);
    addStat('Total Commits', commits.length);

    const avgLineLength = d3.mean(data, (d) => d.length).toFixed(2);
    const longestLine = d3.max(data, (d) => d.length);
    addStat('Avg Line Length', `${avgLineLength} chars`);
    addStat('Longest Line', `${longestLine} chars`);
}

function drawChart() {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 50 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const svg = d3.select('#chart').append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    // Define scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    // Compute min/max for total lines edited
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

    // Define radius scale using scaleSqrt() for correct area perception
    const rScale = d3.scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]); // Adjust range based on experiment

    // Add gridlines BEFORE the axes
    const gridlines = svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(
        d3.axisLeft(yScale)
            .tickSize(-usableArea.width)
            .tickFormat('')
    );

    // Define axes AFTER gridlines
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    // Select tooltip element
    const tooltip = document.getElementById('commit-tooltip');

    // Sort commits by totalLines in descending order for better interactivity
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    // Add dots and tooltip interaction
    const dots = svg.append('g').attr('class', 'dots');

    dots.selectAll('circle')
        .data(sortedCommits) // Use sorted data
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines)) // Dynamic size based on lines edited
        .style('fill', 'steelblue')
        .style('fill-opacity', 0.7) // Add transparency for overlapping dots
        .on('mouseenter', function (event, commit) {
            d3.select(event.currentTarget).style('fill-opacity', 1); // Highlight on hover
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', function (event) {
            updateTooltipPosition(event);
        })
        .on('mouseleave', function () {
            d3.select(event.currentTarget).style('fill-opacity', 0.7); // Restore transparency
            updateTooltipVisibility(false);
        });
}

// Tooltip Functions
function updateTooltipContent(commit) {
    if (!commit || Object.keys(commit).length === 0) return;

    document.getElementById('commit-link').href = commit.url;
    document.getElementById('commit-link').textContent = commit.id;
    document.getElementById('commit-date').textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });
    document.getElementById('commit-time').textContent = `${commit.time} ${commit.timezone}`;
    document.getElementById('commit-author').textContent = commit.author;
    document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.display = isVisible ? 'block' : 'none';
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
}
