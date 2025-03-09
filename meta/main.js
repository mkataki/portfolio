let data = [];
let commits = [];
let filteredCommits = [];
let xScale, yScale;
let selectedCommits = [];
let lines = [];
let files = [];
let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

let NUM_ITEMS = 5;
let ITEM_HEIGHT = 100; // Adjust height for better readability
let VISIBLE_COUNT = 10; 
let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT * 2;

const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
spacer.style('height', `${totalHeight}px`);
const itemsContainer = d3.select('#items-container');

scrollContainer.on('scroll', () => {
    const scrollTop = scrollContainer.property('scrollTop');
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
});

// Load and process data
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
    renderItems(0); // Start at top
    updateScatterplot(filteredCommits);
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});

function processCommits() {
    commits = d3.groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            return {
                id: commit,
                url: 'https://github.com/vis-society/lab-7/commit/' + commit,
                author: first.author,
                datetime: first.datetime,
                hourFrac: first.datetime.getHours() + first.datetime.getMinutes() / 60,
                totalLines: lines.length,
                lines
            };
        });

    filteredCommits = [...commits]; // Initialize with all commits
}

function displayStats() {
    const statsContainer = d3.select('#stats').html("").append('dl').attr('class', 'stats');

    function addStat(title, value) {
        const statItem = statsContainer.append('div').attr('class', 'stat-item');
        statItem.append('dt').text(title);
        statItem.append('dd').text(value);
    }

    addStat('Total LOC', data.length);
    addStat('Total Commits', commits.length);
    addStat('Avg Line Length', `${d3.mean(data, (d) => d.length).toFixed(2)} chars`);
    addStat('Longest Line', `${d3.max(data, (d) => d.length)} chars`);
}

// ** Scrolling functionality **
function renderItems(startIndex) {
    itemsContainer.selectAll('.scroll-item').remove(); 

    const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
    let newCommitSlice = commits.slice(startIndex, endIndex);

    updateScatterplot(newCommitSlice, "#chart-commits");

    itemsContainer.selectAll('.scroll-item')
        .data(newCommitSlice)
        .enter()
        .append('div')
        .attr('class', 'scroll-item')
        .html(commit => `
            <p>
                On ${commit.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" })}, I made another commit.
                I edited ${commit.totalLines} lines across 
                ${d3.rollups(commit.lines, D => D.length, d => d.file).length} file(s). 
                Then I looked over all I had made, and I saw that it was very good.
            </p>
        `)
        .style('position', 'absolute')
        .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`)
        .style('width', '100%')
        .style('padding', '10px')
        .style('background', 'white')
        .style('border-radius', '8px')
        .style('box-shadow', '2px 2px 8px rgba(0,0,0,0.1)');
}


// ** Scatterplot Functionality **
function updateScatterplot(filteredCommits) {
    d3.select('svg').remove();

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

    xScale = d3.scaleTime()
        .domain(d3.extent(filteredCommits, d => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const [minLines, maxLines] = d3.extent(filteredCommits, d => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(d3.axisBottom(xScale));

    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(d3.axisLeft(yScale));

    const dots = svg.append('g').attr('class', 'dots');

    dots.selectAll('circle')
        .data(filteredCommits)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', d => selectedCommits.includes(d) ? "#ff6b6b" : "steelblue")
        .style('fill-opacity', 0.7)
        .on('mouseenter', function (event, commit) {
            d3.select(event.currentTarget)
                .classed('selected', selectedCommits.includes(commit))
                .style('fill-opacity', 1);
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', function (event, commit) {
            d3.select(event.currentTarget)
                .attr('fill', selectedCommits.includes(commit) ? "#ff6b6b" : "steelblue")
                .style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });

        brushSelector()
}


function brushSelector() {
    const svg = d3.select("svg");

    
    const brush = d3.brush()
        .extent([[0, 0], [1000, 600]]) 
        .on("start brush end", brushed); 

    svg.append("g")
        .attr("class", "brush")
        .call(brush);

    
    svg.select(".dots").raise();
}




let brushSelection = null;

function brushed(event) {
    brushSelection = event.selection;
    updateSelection(); 
    updateSelectionCount();  
    updateLanguageBreakdown(); 
}


function isCommitSelected(commit) { 
    if (!brushSelection) return false; 

    const min = { x: brushSelection[0][0], y: brushSelection[0][1] }; 
    const max = { x: brushSelection[1][0], y: brushSelection[1][1] }; 

    // ✅ Make sure xScale uses `datetime` instead of `date`
    const x = xScale(commit.datetime); 
    const y = yScale(commit.hourFrac); 
    
    return x >= min.x && x <= max.x && y >= min.y && y <= max.y; 
}

function updateSelection() {

    d3.selectAll('circle')
        .classed('selected', d => isCommitSelected(d))
        .style("fill", d => isCommitSelected(d) ? "red" : "steelblue"); 
}

function updateSelectionCount() {
    const selectedCommits = brushSelection
      ? commits.filter(isCommitSelected)
      : [];
  
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
  }

  function updateLanguageBreakdown() {
    const selectedCommits = brushSelection
      ? commits.filter(isCommitSelected)
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
    }
  
    return breakdown;
  }

// ** Tooltip Functions **
function updateTooltipContent(commit) {
    d3.select("#commit-link").attr("href", commit.url).text(commit.id);
    d3.select("#commit-date").text(commit.datetime.toLocaleDateString());
    d3.select("#commit-time").text(commit.datetime.toLocaleTimeString());
    d3.select("#commit-author").text(commit.author);
    d3.select("#commit-lines").text(commit.totalLines);
}

function updateTooltipVisibility(show) {
    d3.select("#commit-tooltip").style("display", show ? "block" : "none");
}

function updateTooltipPosition(event) {
    d3.select("#commit-tooltip")
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY + 10}px`);
}

// ** File List Functionality **
function displayCommitFiles() {
    const lines = filteredCommits.flatMap((d) => d.lines);
    let files = d3.groups(lines, (d) => d.file).map(([name, lines]) => ({ name, lines }));

    d3.select('.files').selectAll('div').remove();

    let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');

    filesContainer.append('dt').html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
    filesContainer.append('dd')
        .selectAll('div')
        .data(d => d.lines)
        .enter()
        .append('div')
        .attr('class', 'line')
        .style('background', d => fileTypeColors(d.type));
}
