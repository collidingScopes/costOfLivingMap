/*
To-do:
Allow user to choose benchmark country and adjust all indices based on that benchmark
Add feature where the user can "query" and get back a table of data (countries with higher income than x, countries with lower COL than y, etc...)
Mobile formatting (smaller text size, etc.)
Remove world map tiling (there is blank data once you leave original map)
For full data table, add up+down arrow indicator to show that the column header can be clicked to be sorted
Add scatter-plot chart to highlight outliers (above and below the slope=1 line)
Right-align the table data for readability
Add every other row shading to full data table
Add light shade fill for full data table when hovering on a row
Add data sources, footnotes, table of data
Audit data / double check against source
Label for data not available
*/

let geojsonData;
let csvData;
let map;
let geojson;
let info;
let colorScale = d3.scaleSequential([0, 120], d3.interpolateInferno);

const metricInput = document.querySelector("#metricInput");
metricInput.addEventListener("change",toggleMap);
let selectedMetric = String(metricInput.value);

// Load GeoJSON
fetch('countries.geojson')
  .then(response => response.json())
  .then(data => {
    geojsonData = data;

    if (geojsonData && csvData) {
      // Both datasets are loaded, proceed with map creation
      joinDataAndCreateMap();
    }
  });

// Load CSV
fetch('costOfLiving.csv')
  .then(response => response.text())
  .then(data => {
    csvData = d3.csvParse(data); // Using d3.js for CSV parsing
    console.log(csvData);

    if (geojsonData && csvData) {
      // Both datasets are loaded, proceed with map creation
      joinDataAndCreateMap();
    }

    createDataTable();
    createCountryComparison();
    createScatterplot();
  });

function joinDataAndCreateMap() {
  geojsonData.features.forEach(feature => {
    let countryName = feature.properties.ADMIN;
    let countryData = csvData.find(row => row.Country === countryName);
    if (countryData) {
      // Add CSV data to GeoJSON properties
      feature.properties.costIndex = +Number(countryData['costIndex']);
      feature.properties.incomeIndex = +Number(countryData['incomeIndex']);
      feature.properties.PPI = +Number(countryData['PPI']);
      console.log("Match found!");
      // console.log(countryName + ": "+countryData['costIndex']);
    }
  });

  //console.log(geojsonData);
  createMap();
}

function createMap() {

  // Initialize the map
  map = L.map('map').setView([48.864716, 2.349014], 3); //Paris lat-long, zoom level 3

  // Add a base map layer
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 7,
    minZoom: 2,
    attribution: '© OpenStreetMap',
  }).addTo(map);

  let title;
  let metricName;
  if(selectedMetric == "Cost of Living"){
    title = "Cost of Living Index (U.S.A. = 100)";
    metricName = "costIndex";
  } else if(selectedMetric == "Income"){
    title = "Income Index (U.S.A. = 100)";
    metricName = "incomeIndex";
  } else if(selectedMetric == "Purchasing Power"){
    title = "Purchasing Power Index (U.S.A. = 100)";
    metricName = "PPI";
  }

  addLegend(title,120);

  //Add the geojson layer with heatmap colors and hover info
  geojson = L.geoJson(geojsonData, {
    style: function(feature) {
      return {
        fillColor: colorScale(eval("feature.properties."+metricName)),
        fillOpacity: 0.8,
        weight: 1,
        color: "white",
        opacity: 1,
      };
    },
    onEachFeature: onEachFeature
  }).addTo(map);

  info = L.control();
  info.onAdd = function (map) {
      this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
      this.update();
      return this._div;
  };
  // method that we will use to update the control based on feature properties passed
  info.update = function (props) {
      this._div.innerHTML = '<h4>'+title+'</h4>' +  (props ?
          '<b>' + props.ADMIN + '</b><br />' + numberFormatting(eval("props."+metricName))
          : 'Hover over a country');
  };
  info.addTo(map);

}

//MAP CLICK INTERACTION EVENTS

function highlightFeature(e) {
  
  var layer = e.target;

  if(layer.feature.properties.costIndex != undefined && !isIOS && !isAndroid){
    layer.setStyle({
      weight: 4,
      color: '#e7037c',
      dashArray: '',
    });
  }

  /*
  Popup upon hover
  var popup = L.popup()
    .setLatLng(e.latlng)
    .setContent(`
    <strong>${layer.feature.properties.ADMIN}</strong><br>
    Net worth: ${numberFormatting(layer.feature.properties.costIndex)}<br>
    `)
   .openOn(map);
  */

  layer.bindPopup(`
    <strong>${layer.feature.properties.ADMIN}</strong><br>
    Cost of Living Index: ${numberFormatting(layer.feature.properties.costIndex)}<br>
    Income Index: ${numberFormatting(layer.feature.properties.incomeIndex)}<br>
    Purchasing Power Index: ${numberFormatting(layer.feature.properties.PPI)}<br>

  `);
  
  layer.bringToFront();
  info.update(layer.feature.properties);

}

function resetHighlight(e) {
  geojson.resetStyle(e.target);
  info.update();

}

function onEachFeature(feature, layer) {
  layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: highlightFeature,
  });

}

//HELPER FUNCTIONS

function toggleMap(){
  removeMap();
  selectedMetric = String(metricInput.value);
  createMap();
}

function dollarFormatting(value) {
  return Math.round(Number(value)).toLocaleString();
}

function numberFormatting(value) {
  return (Math.round(Number(value)*10)/10).toLocaleString();
}

function percentFormatting(value) {
  return (Math.round(Number(value)*100)).toLocaleString()+"%";
}

function addMap(){
  if(map != undefined){
    createIncomeMap();
  }
}

function removeMap(){
  if(map){
    map.remove();
  }
}

function addLegend(title, maxValue){
  let legend = L.control({position: 'bottomright'});
  let step = 10;
  let numSteps = maxValue / step + 1;
  legend.onAdd = function(map) {
    let div = L.DomUtil.create('div', 'info legend');
  
    div.innerHTML = '<div><b>'+title+'</b></div>';    
    for (let i = 0; i < numSteps; i++) {
      div.innerHTML += `<i style="background:${colorScale(i*step)}"></i>${numberFormatting(i*step)}<br>`;
    }
  
    return div;
  };
  legend.addTo(map);
}

//detect user browser
var ua = navigator.userAgent;
var isSafari = false;
var isFirefox = false;
var isIOS = false;
var isAndroid = false;
if(ua.includes("Safari")){
    isSafari = true;
}
if(ua.includes("Firefox")){
    isFirefox = true;
}
if(ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod")){
    isIOS = true;
}
if(ua.includes("Android")){
    isAndroid = true;
}
console.log("isSafari: "+isSafari+", isFirefox: "+isFirefox+", isIOS: "+isIOS+", isAndroid: "+isAndroid);

function createDataTable(){
    
  // Sort the data by costIndex from high to low
  csvData.sort((a, b) => b.costIndex - a.costIndex);

  // Create table
  const table = document.createElement('table');
  table.setAttribute("id", "fullDataTable");

  // Create table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Country', 'Cost of Living Index', 'Income Index', 'Purchasing Power Index'].forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create table body
  const tbody = document.createElement('tbody');
  csvData.forEach((item, index) => {
    const row = document.createElement('tr');

    const countryCell = document.createElement('td');
    countryCell.textContent = item.Country;

    const costIndexCell = document.createElement('td');
    costIndexCell.textContent = item.costIndex;

    const incomeIndexCell = document.createElement('td');
    incomeIndexCell.textContent = item.incomeIndex;

    const PPICell = document.createElement('td');
    PPICell.textContent = item.PPI;

    row.appendChild(countryCell);
    row.appendChild(costIndexCell);
    row.appendChild(incomeIndexCell);
    row.appendChild(PPICell);
    
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  // Add table to the document
  document.body.appendChild(table);

  sorttable.makeSortable(table);

}

function createCountryComparison(){

  //sort country names A-Z
  csvData.sort( function( a, b ) {
    a = a.Country.toLowerCase();
    b = b.Country.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  });

  const selectA = document.createElement('select');
  const selectB = document.createElement('select');

  selectA.classList.add("selectA");
  selectB.classList.add("selectB");

  let countryA;
  let countryB;

  // Populate the select elements
  populateSelect(csvData);
  function populateSelect(countries) {

    countries.forEach(country => {
      var currentOption = new Option(country.Country);
      selectA.options.add(currentOption);
    });

    countries.forEach(country => {
      var currentOption = new Option(country.Country);
      selectB.options.add(currentOption);
    });

  }

  document.querySelector("#countryACell").appendChild(selectA);
  document.querySelector("#countryBCell").appendChild(selectB);

  selectA.value = "Canada";
  selectB.value = "France";

  selectA.addEventListener("change",changeCountryA);
  selectB.addEventListener("change",changeCountryB);

  changeCountryA();
  changeCountryB();

  function changeCountryA(){
    countryA = selectA.value;

    const countryInfo = csvData.find(country => country.Country === countryA);
    if (countryInfo) {
      document.querySelector("#costACell").textContent = countryInfo.costIndex;
      document.querySelector("#incomeACell").textContent = countryInfo.incomeIndex;
      document.querySelector("#PPIACell").textContent = countryInfo.PPI;
      displayCountryDelta();
    }
  }

  function changeCountryB(){
    countryB = selectB.value;

    const countryInfo = csvData.find(country => country.Country === countryB);
    if (countryInfo) {
      document.querySelector("#costBCell").textContent = countryInfo.costIndex;
      document.querySelector("#incomeBCell").textContent = countryInfo.incomeIndex;
      document.querySelector("#PPIBCell").textContent = countryInfo.PPI;
      displayCountryDelta();
    }
  }

  function displayCountryDelta(){
    let costDelta = Number(document.querySelector("#costACell").textContent) / Number(document.querySelector("#costBCell").textContent) - 1;
    let costDeltaMessage;
    if(costDelta > 0){
      costDeltaMessage = "<b>Cost of living</b> in "+countryA+" is <span class='positiveDelta'>"+percentFormatting(Math.abs(costDelta))+" higher</span> than in "+countryB;
    } else if (costDelta < 0){
      costDeltaMessage = "<b>Cost of living</b> in "+countryA+" is <span class='negativeDelta'>"+percentFormatting(Math.abs(costDelta))+" lower</span> than in "+countryB;
    }
    document.querySelector("#costDeltaCell").innerHTML = costDeltaMessage;

    let incomeDelta = Number(document.querySelector("#incomeACell").textContent) / Number(document.querySelector("#incomeBCell").textContent) - 1;
    let incomeDeltaMessage;
    if(incomeDelta > 0){
      incomeDeltaMessage = "<b>Income</b> in "+countryA+" is <span class='positiveDelta'>"+percentFormatting(Math.abs(incomeDelta))+" higher</span> than in "+countryB;
    } else if (incomeDelta < 0){
      incomeDeltaMessage = "<b>Income</b> in "+countryA+" is <span class='negativeDelta'>"+percentFormatting(Math.abs(incomeDelta))+" lower</span> than in "+countryB;
    }
    document.querySelector("#incomeDeltaCell").innerHTML = incomeDeltaMessage;

    let PPIDelta = Number(document.querySelector("#PPIACell").textContent) / Number(document.querySelector("#PPIBCell").textContent) - 1;
    let PPIDeltaMessage;
    if(PPIDelta > 0){
      PPIDeltaMessage = "<b>Purchasing power</b> in "+countryA+" is <span class='positiveDelta'>"+percentFormatting(Math.abs(PPIDelta))+" higher</span> than in "+countryB;
    } else if (PPIDelta < 0){
      PPIDeltaMessage = "<b>Purchasing power</b> in "+countryA+" is <span class='negativeDelta'>"+percentFormatting(Math.abs(PPIDelta))+" lower</span> than in "+countryB;
    }
    document.querySelector("#PPIDeltaCell").innerHTML = PPIDeltaMessage;  
  }

}

function createScatterplot(){

  // Sort the data by population from high to low, so that largest circles are drawn first
  csvData.sort((a, b) => b.population - a.population);

  // Set up the dimensions and margins of the graph
  const margin = {top: 45, right: 10, bottom: 45, left: 45};
  const width = window.innerWidth*0.95 - margin.left - margin.right;
  const height = Math.min(window.innerHeight*0.8, width) - margin.top - margin.bottom;

  // Create SVG element
  const svg = d3.select("#scatterplot")
    .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Read the CSV file
  d3.csv("costOfLiving.csv").then(function(data) {
  // Convert string values to numbers
    data.forEach(d => {
      d.costIndex = +d.costIndex;
      d.incomeIndex = +d.incomeIndex;
      d.population = +d.population;
      d.PPI = +d.PPI;
    });

    // Create scales
    const x = d3.scaleLinear()
      .domain([0, 150])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, 150])
      .range([height, 0]);

    const size = d3.scaleLinear()
      //.domain([0, d3.max(data, d => d.population)])
      .domain([0,1200000000])
      .range([6, 40]);  // Adjust min and max circle sizes as needed

    // Add X gridlines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .tickSize(-height)
        .tickFormat("")
      )
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "2,2")
      );

    // Add Y gridlines
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("")
      )
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "2,2")
      );

    // Create axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .append("text")
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .style("font-weight","bold")
      .style("font-size","14px")
      .text("Cost of Living Index");

    svg.append("g")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -30)
      .attr("x", -height / 2)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .style("font-weight","bold")
      .style("font-size","14px")
      .text("Income Index");
    
    // Handmade legend

    let regionLabels = [
      "North America", "Central America / Carribean",
      "South America","Europe",
      "Middle East","Africa",
      "Asia","Oceania",
    ];
    let regionColors = 
    [
      "hsl(0,90%,50%)","hsl(45,90%,50%)",
      "hsl(90,90%,50%)","hsl(135,90%,50%)",
      "hsl(180,90%,50%)","hsl(225,90%,50%)",
      "hsl(270,90%,50%)","hsl(315,90%,50%)",
    ];

    svg.append('rect')
        .attr('x', 15)
        .attr('y', 15)
        .attr('width', 190)
        .attr('height', 135)
        .attr('class', 'legendBox')

    for(i=0; i<regionLabels.length; i++){
      svg.append("circle").attr("cx",30).attr("cy",30+15*i).attr("r", 6).style("fill", regionColors[i]);
      svg.append("text").attr("x", 40).attr("y", 32+15*i).text(regionLabels[i]).style("font-size", "12px").attr("alignment-baseline","middle").attr("class","legendLabel");
    }

    // Add dots
    svg.selectAll(".activeCircle")
      .data(data)
      .enter()
      .append("circle")
        .attr("cx", d => x(d.costIndex))
        .attr("cy", d => y(d.incomeIndex))
        .attr("r", d => size(d.population))
        //.style("fill", "#69b3a2")
        .style("fill",function(d){
          let selectedColor = 
          (d.region == regionLabels[0]) ? regionColors[0] :
          (d.region == regionLabels[1]) ? regionColors[1] :
          (d.region == regionLabels[2]) ? regionColors[2] :
          (d.region == regionLabels[3]) ? regionColors[3] :
          (d.region == regionLabels[4]) ? regionColors[4] :
          (d.region == regionLabels[5]) ? regionColors[5] :
          (d.region == regionLabels[6]) ? regionColors[6] :
          (d.region == regionLabels[7]) ? regionColors[7] :
          "black";

          return selectedColor;
        })
        .style("opacity", 0.85)
        .attr("stroke", "black")
        .attr("class","activeCircle");

    // Calculate linear regression
    const regression = d3.regressionLinear()
      .x(d => d.costIndex)
      .y(d => d.incomeIndex);

    const regressionLine = regression(data);

    // Add regression line
    svg.append("line")
      .attr("x1", x(regressionLine[0][0]))
      .attr("y1", y(regressionLine[0][1]))
      .attr("x2", x(regressionLine[1][0]))
      .attr("y2", y(regressionLine[1][1]))
      .attr("stroke", "black")
      .attr("stroke-dasharray", "2,2")
      .attr("stroke-width", 2);

    // Add regression formula
    const slope = Math.round(regressionLine.a*100)/100;
    const intercept = Math.round(regressionLine.b*100)/100;
    const rSquared = Math.round(regressionLine.rSquared*1000)/1000;

    svg.append("text")
      .attr("x", width-100)
      .attr("y", 20)
      .attr("text-anchor", "start")
      .style("font-size", "12px")
      .style("font-weight","bold")
      .style("fill", "black")
      .text(`y = ${slope}x + ${intercept}`)
      .append("tspan")
      .attr("x", width-100)
      .attr("dy", "1.2em")
      .text(`R² = ${rSquared}`);

    // Add tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "solid")
      .style("border-width", "1px")
      .style("border-radius", "5px")

    // Add interactivity
    svg.selectAll(".activeCircle")
      .on("mouseover", function(event, d) {
        d3.select(this).style("stroke-width", "4px");
        tooltip
          .style("font-size", "12px")
          .style("padding", "5px")
          .style("opacity", .9);
        tooltip.html(`<b>${d.Country}</b><br/>Cost Index: ${d.costIndex}<br/>Income Index: ${d.incomeIndex}<br/>Purchasing Power Index: ${d.PPI}<br/>Population: ${d3.format(",")(d.population)}`)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 40) + "px");
      })
      .on("click", function(event, d) {
        d3.select(this).style("stroke-width", "4px");
        tooltip
          .style("font-size", "12px")
          .style("padding", "5px")
          .style("opacity", .9);
        tooltip.html(`<b>${d.Country}</b><br/>Cost Index: ${d.costIndex}<br/>Income Index: ${d.incomeIndex}<br/>Purchasing Power Index: ${d.PPI}<br/>Population: ${d3.format(",")(d.population)}`)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 40) + "px");
      })
      .on("mouseout", function(d) {
        d3.select(this).style("stroke-width", "1px");
        //tooltip.transition()
        //  .duration(0)
        tooltip
          .style("opacity",0)
          .style("padding",0);
        tooltip.html('');
      });

    // Add a title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text("Global Cost of Living vs. Incomes")
      .append("tspan")
      .attr("x", width / 2)
      .attr("dy", "1.2em")
      .text(`(Indexed values where U.S.A. = 100, as of 2023)`)
      .style("font-weight","normal")
      .style("font-size","16px");

  });
}