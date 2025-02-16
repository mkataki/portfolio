import { fetchJSON, renderProjects} from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects')
renderProjects(projects, projectsContainer, 'h2');

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let sliceGenerator = d3.pie().value(d => d.value); 

function renderPieChart(data) {
    d3.select("#projects-pie-plot").selectAll("*").remove(); 
    d3.select(".legend").selectAll("*").remove(); 

    let arcData = sliceGenerator(data);
    let arcs = arcData.map(d => arcGenerator(d));
    let colors = d3.scaleOrdinal(d3.schemeTableau10);
    let svg = d3.select("#projects-pie-plot");

    let selectedIndex = -1;

    arcs.forEach((arc, idx) => {
        svg.append("path")
           .attr("d", arc)
           .attr("fill", colors(idx))
           .on("click", function () {
                selectedIndex = selectedIndex === idx ? -1 : idx;

                svg.selectAll("path")
                    .attr("class", (_, i) => (i === selectedIndex ? "selected" : ""));

                d3.selectAll(".legend li")
                    .attr("class", (_, i) => (i === selectedIndex ? "selected" : ""));

                if (selectedIndex === -1) {
                    renderProjects(projects, projectsContainer, "h2"); // Show all projects
                } else {
                    let selectedYear = data[selectedIndex]?.label; 
                    if (!selectedYear) return; 

                    let filteredProjects = projects.filter(project => project.year === selectedYear);
                    renderProjects(filteredProjects, projectsContainer, "h2");
                }
           });
    });

    let legend = d3.select('.legend');
    data.forEach((d, idx) => {
        legend.append("li")
              .attr("style", `--color:${colors(idx)}`)
              .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });
}


let rolledData = d3.rollups(
    projects,
    (v) => v.length,
    (d) => d.year,
);
let data = rolledData.map(([year, count]) => ({ value: count, label: year }));
renderPieChart(data);

let query = '';
let searchInput = document.querySelector('.searchBar');


searchInput.addEventListener('input', (event) => {
    query = event.target.value.toLowerCase();

    let filteredProjects = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query);
    });

    renderProjects(filteredProjects, projectsContainer, 'h2');

    let filteredData = d3.rollups(
        filteredProjects,
        (v) => v.length,
        (d) => d.year
    ).map(([year, count]) => ({ value: count, label: year }));

    renderPieChart(filteredData);
});

const width = 1000;
const height = 600;

const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');