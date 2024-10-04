/*
To-do:
Allow user to choose benchmark country and adjust all indices based on that benchmark
Add feature where the user can "query" and get back a table of data (countries with higher income than x, countries with lower COL than y, etc...)
Add feature to compare one country against it's neighbors and get aggregate statistics
Consider adding toggle for log scale for the scatterplot
Label for countries with data not available on the map
*/

// let csvDataLink = "https://themeasureofaplan.com/wp-content/uploads/2024/10/costOfLiving.csv";
// let geojsonDataLink = "https://themeasureofaplan.com/wp-content/uploads/2024/10/countriesSimplified3.geojson";
let csvDataLink = "costOfLiving.csv";
let geojsonDataLink = "countriesSimplified3.geojson";
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
fetch(geojsonDataLink)
  .then(response => response.json())
  .then(data => {
    geojsonData = data;

    if (geojsonData && csvData) {
      // Both datasets are loaded, proceed with map creation
      joinDataAndCreateMap();
    }
  });

// Load CSV
fetch(csvDataLink)
  .then(response => response.text())
  .then(data => {
    csvData = d3.csvParse(data); // Using d3.js for CSV parsing
    //console.log(csvData);

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
      //console.log("Match found!");
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
    minZoom: 1,
    attribution: '© OpenStreetMap',
  }).addTo(map);

  let title;
  let metricName;
  if(selectedMetric == "Cost of Living"){
    title = `Cost of Living Index<br>(USA = 100)`;
    metricName = "costIndex";
  } else if(selectedMetric == "Income"){
    title = `Income Index<br>(USA = 100)`;
    metricName = "incomeIndex";
  } else if(selectedMetric == "Purchasing Power"){
    title = `Purchasing Power Index<br>(USA = 100)`;
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
          props.ADMIN + '<br />' + numberFormatting(eval("props."+metricName))
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
  
    div.innerHTML = '<div>'+title+'</div>';    
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
  ['Country', 'Cost of Living Index', 'Income Index', 'Purchasing Power Index', 'Region', 'Population'].forEach(headerText => {
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
    costIndexCell.classList.add("right-align-cell");
    costIndexCell.textContent = item.costIndex;

    const incomeIndexCell = document.createElement('td');
    incomeIndexCell.classList.add("right-align-cell");
    incomeIndexCell.textContent = item.incomeIndex;

    const PPICell = document.createElement('td');
    PPICell.classList.add("right-align-cell");
    PPICell.textContent = item.PPI;
    
    const regionCell = document.createElement('td');
    regionCell.textContent = item.region;

    const populationCell = document.createElement('td');
    populationCell.classList.add("right-align-cell");
    populationCell.textContent = Number(item.population).toLocaleString();

    row.appendChild(countryCell);
    row.appendChild(costIndexCell);
    row.appendChild(incomeIndexCell);
    row.appendChild(PPICell);
    row.appendChild(populationCell);
    row.appendChild(regionCell);

    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  // Add table to the document
  document.querySelector("#fullDataTableDiv").appendChild(table);

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

  //flags

  const flagImageA = document.getElementById('flag-image-a');
  const flagImageB = document.getElementById('flag-image-b');

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

      const countryCode = String(countryInfo.abbreviation).toLowerCase();
      const flagUrl = `https://flagcdn.com/32x24/${countryCode}.png`;
      flagImageA.src = flagUrl;
      flagImageA.style.display = 'inline-block';

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

      const countryCode = String(countryInfo.abbreviation).toLowerCase();
      const flagUrl = `https://flagcdn.com/32x24/${countryCode}.png`;
      flagImageB.src = flagUrl;
      flagImageB.style.display = 'inline-block';

    }
  }

  function displayCountryDelta(){
    let costDelta = Number(document.querySelector("#costACell").textContent) / Number(document.querySelector("#costBCell").textContent) - 1;
    let costDeltaMessage = "";
    if(costDelta > 0){
      costDeltaMessage = "<b>Cost of living</b> in "+countryA+" is <span class='positiveDelta'>"+percentFormatting(Math.abs(costDelta))+" higher</span> than in "+countryB;
    } else if (costDelta < 0){
      costDeltaMessage = "<b>Cost of living</b> in "+countryA+" is <span class='negativeDelta'>"+percentFormatting(Math.abs(costDelta))+" lower</span> than in "+countryB;
    }
    document.querySelector("#costDeltaCell").innerHTML = costDeltaMessage;

    let incomeDelta = Number(document.querySelector("#incomeACell").textContent) / Number(document.querySelector("#incomeBCell").textContent) - 1;
    let incomeDeltaMessage = "";
    if(incomeDelta > 0){
      incomeDeltaMessage = "<b>Income</b> in "+countryA+" is <span class='positiveDelta'>"+percentFormatting(Math.abs(incomeDelta))+" higher</span> than in "+countryB;
    } else if (incomeDelta < 0){
      incomeDeltaMessage = "<b>Income</b> in "+countryA+" is <span class='negativeDelta'>"+percentFormatting(Math.abs(incomeDelta))+" lower</span> than in "+countryB;
    }
    document.querySelector("#incomeDeltaCell").innerHTML = incomeDeltaMessage;

    let PPIDelta = Number(document.querySelector("#PPIACell").textContent) / Number(document.querySelector("#PPIBCell").textContent) - 1;
    let PPIDeltaMessage = "";
    let comparisonResultMessage = "";
    if(PPIDelta > 0){
      PPIDeltaMessage = "<b>Purchasing power</b> in "+countryA+" is <span class='positiveDelta'>"+percentFormatting(Math.abs(PPIDelta))+" higher</span> than in "+countryB;
      comparisonResultMessage = "Result: On average, <span class='positiveDelta'>people in "+countryA+" are "+percentFormatting(Math.abs(PPIDelta))+" wealthier</span> than people in "+countryB+", considering average income and cost of living.";
    } else if (PPIDelta < 0){
      PPIDeltaMessage = "<b>Purchasing power</b> in "+countryA+" is <span class='negativeDelta'>"+percentFormatting(Math.abs(PPIDelta))+" lower</span> than in "+countryB;
      comparisonResultMessage = "Result: On average, <span class='negativeDelta'>people in "+countryA+" are "+percentFormatting(Math.abs(PPIDelta))+" poorer</span> than people in "+countryB+", considering average income and cost of living.";
    }
    document.querySelector("#PPIDeltaCell").innerHTML = PPIDeltaMessage;  
    document.querySelector("#comparisonResult").innerHTML = comparisonResultMessage;  
  }

}

function createScatterplot(){

  // Set up the dimensions and margins of the graph
  const margin = {top: 45, right: 10, bottom: 45, left: 45};
  let width = Math.min(window.innerWidth*0.95,1000)- margin.left - margin.right;
  let height = Math.min(window.innerHeight*0.95, 1000) - margin.top - margin.bottom;

  // Create SVG element
  const svg = d3.select("#scatterplot")
    .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Read the CSV file
  d3.csv(csvDataLink).then(function(data) {
  // Convert string values to numbers
    data.forEach(d => {
      d.costIndex = +d.costIndex;
      d.incomeIndex = +d.incomeIndex;
      d.population = +d.population;
      d.PPI = +d.PPI;
    });

    // Create scales
    let maxCostIndex = d3.max(data, d => d.costIndex);
    let maxIncomeIndex = d3.max(data, function(d){
      return d.incomeIndex;
    });
    //console.log("Max values: "+maxCostIndex+", "+maxIncomeIndex);
    let roundedMaxValue = Math.ceil(Math.max(maxCostIndex, maxIncomeIndex) / 10)*10; //round up to nearest 10
    //console.log("roundedMaxValue: "+roundedMaxValue);

    const x = d3.scaleLinear()
      .domain([0, roundedMaxValue])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, roundedMaxValue])
      .range([height, 0]);

    const size = d3.scaleLinear()
      //.domain([0, d3.max(data, d => d.population)])
      .domain([0,Math.sqrt(1400000000)])
      .range([4, 4+Math.min(width,height)*0.06]);  // Adjust min and max circle sizes as needed

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
      .text("Income Index")
      .attr("class","xAxis");

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
      .text("Cost of Living Index")
      .attr("class","yAxis");
    
    // Handmade legend

    let regionLabels = [
      "North America", "Central America / Carribean",
      "South America","Europe",
      "Middle East","Africa",
      "Asia","Oceania",
    ];
    let regionColors = 
    [
      "#ffd700",
      "#ffb14e",
      "#fa8775",
      "#ea5f94",
      "#cd34b5",
      "#9d02d7",
      "#0000ff",
      "#000000"
    ];

    svg.append('rect')
        .attr('x', 5)
        .attr('y', 5)
        .attr('width', 190)
        .attr('height', 135)
        .attr('class', 'legendBox')

    for(i=0; i<regionLabels.length; i++){
      svg.append("circle").attr("cx",15).attr("cy",15+15*i).attr("r", 5).style("fill", regionColors[i]);
      svg.append("text").attr("x", 25).attr("y", 17+15*i).text(regionLabels[i]).style("font-size", "12px").attr("alignment-baseline","middle").attr("class","legendLabel");
    }

    //Add box labels for low / high purchasing power countries
    svg.append('rect')
      .attr('x', x(18))
      .attr('y', y(93))
      .attr('width', 100)
      .attr('height', 30)
      .attr('class', 'lowPurchasingPowerLabel');
    svg.append("text")
      .attr("x", x(20))
      .attr("y", y(90.5))
      .attr("alignment-baseline","middle")
      .attr("class","purchasingPowerBoxLabel")
      .text("Low purchasing")
      .append("tspan")
      .attr("x", x(20))
      .attr("dy", "1.2em")
      .text("power countries")

    svg.append('rect')
      .attr('x', x(100))
      .attr('y', y(70))
      .attr('width', 100)
      .attr('height', 30)
      .attr('class', 'highPurchasingPowerLabel');
    svg.append("text")
      .attr("x", x(102))
      .attr("y", y(67.5))
      .attr("alignment-baseline","middle")
      .attr("class","purchasingPowerBoxLabel")
      .text("High purchasing")
      .append("tspan")
      .attr("x", x(102))
      .attr("dy", "1.2em")
      .text("power countries")
    
    //Add X=Y dividing line
    svg.append("line")
      .attr("x1", x(0))
      .attr("y1", y(0))
      .attr("x2", x(roundedMaxValue))
      .attr("y2", y(roundedMaxValue))
      .attr("stroke", "#666666")
      .attr("stroke-dasharray", "10,4")
      .attr("stroke-width", 1);

    // Calculate linear regression
    const regression = d3.regressionLinear()
      .x(d => d.incomeIndex)
      .y(d => d.costIndex);

    const regressionLine = regression(data);

    // Add regression line
    svg.append("line")
      .attr("x1", x(regressionLine[0][0]))
      .attr("y1", y(regressionLine[0][1]))
      .attr("x2", x(regressionLine[1][0]))
      .attr("y2", y(regressionLine[1][1]))
      .attr("stroke", "#c25b0b")
      .attr("stroke-dasharray", "10,4")
      .attr("stroke-width", 2);

    // Add regression formula
    const slope = Math.round(regressionLine.a*100)/100;
    const intercept = Math.round(regressionLine.b*100)/100;
    const rSquared = Math.round(regressionLine.rSquared*1000)/1000;

    svg.append("text")
      .attr("x", width-95)
      .attr("y", height-40)
      .attr("text-anchor", "start")
      .style("font-size", "12px")
      .style("font-style","italic")
      .style("fill", "#c25b0b")
      .text("Line of Best Fit")
      .append("tspan")
      .attr("x", width-95)
      .attr("dy", "1.2em")
      .text(`y = ${slope}x + ${intercept}`)
      .append("tspan")
      .attr("x", width-95)
      .attr("dy", "1.2em")
      .text(`R² = ${rSquared}`);

    // Add dots
    svg.selectAll(".activeCircle")
    .data(data)
    .enter()
    .append("circle")
      .attr("cx", d => x(d.incomeIndex))
      .attr("cy", d => y(d.costIndex))
      .attr("r", d => size(Math.sqrt(d.population)))
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
      .style("opacity", 0.9)
      .attr("stroke", "black")
      .attr("class","activeCircle");

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
          .style("font-size", "11px")
          .style("padding", "5px")
          .style("opacity", .9);
        tooltip
          .html(`
            <b>${d.Country}</b>
            <table>
              <tr>
                <td>Cost Index</td>
                <td>${d.costIndex}</td>
              </tr>
              <tr>
                <td>Income Index</td>
                <td>${d.incomeIndex}</td>
              </tr>
              <tr>
                <td>Purchasing Power</td>
                <td>${d.PPI}</td>
              </tr>
              <tr>
                <td>Population</td>
                <td>${Number(d.population).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Region</td>
                <td>${d.region}</td>
              </tr>                                                        
            </table>
          `)
          .style("left", function(){
            if(event.pageX > window.innerWidth*0.6){
              return (event.pageX - Math.min(175,window.innerWidth*0.5)) + "px";
            } else {
              return (event.pageX + 15) + "px";
            }
          })
          .style("top", function(){
            if(event.pageX > window.innerWidth*0.6){
              return (event.pageY + 10) + "px";
            } else {
              return (event.pageY - 40) + "px";
            }
          });
      })
      .on("click", function(event, d) {
        d3.select(this).style("stroke-width", "4px");
        tooltip
          .style("font-size", "11px")
          .style("padding", "5px")
          .style("opacity", .9);
          tooltip
          .html(`
            <b>${d.Country}</b>
            <table>
              <tr>
                <td>Cost Index</td>
                <td>${d.costIndex}</td>
              </tr>
              <tr>
                <td>Income Index</td>
                <td>${d.incomeIndex}</td>
              </tr>
              <tr>
                <td>Purchasing Power</td>
                <td>${d.PPI}</td>
              </tr>
              <tr>
                <td>Population</td>
                <td>${Number(d.population).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Region</td>
                <td>${d.region}</td>
              </tr>                                                        
            </table>
          `)
          .style("left", function(){
            if(event.pageX > window.innerWidth*0.6){
              return (event.pageX - Math.min(175,window.innerWidth*0.5)) + "px";
            } else {
              return (event.pageX + 15) + "px";
            }
          })
          .style("top", function(){
            if(event.pageX > window.innerWidth*0.6){
              return (event.pageY + 10) + "px";
            } else {
              return (event.pageY - 40) + "px";
            }
          });
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
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .text("Global Income vs. Cost of Living")
      .append("tspan")
      .attr("x", width / 2)
      .attr("dy", "1.2em")
      .text(`(Indexed values where USA = 100, as of 2023)`)
      .style("font-weight","normal")
      .style("font-size","14px");

  });

}