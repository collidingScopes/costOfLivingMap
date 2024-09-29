/*
Adjust colour scale (stark contrast depending on whether the index is <100 or >100; rounded numbers / pre-chosen values?)
Allow user to choose benchmark country and adjust all indices based on that benchmark
Add feature where the user can "query" and get back a table of data (countries with higher income than x, countries with lower COL than y, etc...)
Mobile hover / click on leaflet map not working
Add ranked table below
Table / feature to compare two countries side-by-side
Remove world map tiling (there is blank data once you leave original map)
Add data sources, footnotes, table of data
Audit data / double check against source
Label for data not available
*/

let geojsonData;
let csvData;
let map;
let geojson;
let info;

const metricInput = document.querySelector("#metricInput");
metricInput.addEventListener("change",toggleMap);
let selectedMetric = String(metricInput.value);

function toggleMap(){
  removeMap();
  selectedMetric = String(metricInput.value);
  if(selectedMetric == "Cost of Living"){
    createCostMap();
  } else if(selectedMetric == "Income"){
    createIncomeMap();
  } else if(selectedMetric == "Savings Power"){
    createPPIMap();
  }
}

// Load GeoJSON
fetch('countries.geojson')
  .then(response => response.json())
  .then(data => {
    geojsonData = data;
    createMap();
  });

// Load CSV
fetch('costOfLiving.csv')
  .then(response => response.text())
  .then(data => {
    csvData = d3.csvParse(data); // Using d3.js for CSV parsing
    createMap();
  });

function createMap() {
  if (geojsonData && csvData) {
    // Both datasets are loaded, proceed with map creation
    joinDataAndCreateMap();
  }
}

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
      // Add other properties as needed
    }
  });

  //console.log(geojsonData);

  // Create the map
  createCostMap();
}

function createCostMap() {
  // Initialize the map
  map = L.map('map').setView([48.864716, 2.349014], 3); //Paris lat-long, zoom level 3

  // Add a base map layer
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 7,
    minZoom: 2,
    attribution: '© OpenStreetMap',
  }).addTo(map);

  // Define a color scale (using d3.js)
  let colorScale = d3.scaleQuantile()
    .domain(geojsonData.features.map(f => Number(f.properties.costIndex)))
    .range(['#fde725','#b5de2b','#6ece58','#35b779','#1f9e89', '#26828e', '#31688e', '#3e4989', '#482878', '#440154']);

  // Add a legend
  let legend = L.control({position: 'bottomright'});
  legend.onAdd = function(map) {
    let div = L.DomUtil.create('div', 'info legend');
    let grades = colorScale.quantiles();
    let labels = [];

    // Add min & max
    div.innerHTML = '<div><b>Cost of Living Index (relative to U.S.)</b></div>';
    div.innerHTML += `<i style="background:${colorScale.range()[0]}"></i>${Math.round(d3.min(colorScale.domain()))}<br>`;
    
    for (let i = 0; i < grades.length; i++) {
      div.innerHTML += `<i style="background:${colorScale.range()[i+1]}"></i>${numberFormatting(grades[i])}<br>`;
    }

    return div;
  };
  legend.addTo(map);

  //Add the geojson layer with heatmap colors and hover info
  geojson = L.geoJson(geojsonData, {
    style: function(feature) {
      return {
        fillColor: colorScale(feature.properties.costIndex),
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
      this._div.innerHTML = '<h4>Cost of Living Index (relative to U.S.)</h4>' +  (props ?
          '<b>' + props.ADMIN + '</b><br />' + numberFormatting(props.costIndex)
          : 'Hover over a country');
  };
  info.addTo(map);

}

function createIncomeMap() {
  // Initialize the map
  map = L.map('map').setView([48.864716, 2.349014], 3); //Paris lat-long, zoom level 3

  // Add a base map layer
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 7,
    minZoom: 2,
    attribution: '© OpenStreetMap',
  }).addTo(map);

  // Define a color scale (using d3.js)
  let colorScale = d3.scaleQuantile()
    .domain(geojsonData.features.map(f => Number(f.properties.incomeIndex)))
    .range(['#fde725','#b5de2b','#6ece58','#35b779','#1f9e89', '#26828e', '#31688e', '#3e4989', '#482878', '#440154']);

  // Add a legend
  let legend = L.control({position: 'bottomright'});
  legend.onAdd = function(map) {
    let div = L.DomUtil.create('div', 'info legend');
    let grades = colorScale.quantiles();
    let labels = [];

    // Add min & max
    div.innerHTML = '<div><b>Income Index (relative to U.S.)</b></div>';
    div.innerHTML += `<i style="background:${colorScale.range()[0]}"></i>${Math.round(d3.min(colorScale.domain()))}<br>`;
    
    for (let i = 0; i < grades.length; i++) {
      div.innerHTML += `<i style="background:${colorScale.range()[i+1]}"></i>${numberFormatting(grades[i])}<br>`;
    }

    return div;
  };
  legend.addTo(map);

  //Add the geojson layer with heatmap colors and hover info
  geojson = L.geoJson(geojsonData, {
    style: function(feature) {
      return {
        fillColor: colorScale(feature.properties.incomeIndex),
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
      this._div.innerHTML = '<h4>Income Index (relative to U.S.)</h4>' +  (props ?
          '<b>' + props.ADMIN + '</b><br />' + numberFormatting(props.incomeIndex)
          : 'Hover over a country');
  };
  info.addTo(map);
}

function createPPIMap() {
  // Initialize the map
  map = L.map('map').setView([48.864716, 2.349014], 3); //Paris lat-long, zoom level 3

  // Add a base map layer
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 7,
    minZoom: 2,
    attribution: '© OpenStreetMap',
  }).addTo(map);

  // Define a color scale (using d3.js)
  let colorScale = d3.scaleQuantile()
    .domain(geojsonData.features.map(f => Number(f.properties.PPI)))
    .range(['#fde725','#b5de2b','#6ece58','#35b779','#1f9e89', '#26828e', '#31688e', '#3e4989', '#482878', '#440154']);

  // Add a legend
  let legend = L.control({position: 'bottomright'});
  legend.onAdd = function(map) {
    let div = L.DomUtil.create('div', 'info legend');
    let grades = colorScale.quantiles();
    let labels = [];

    // Add min & max
    div.innerHTML = '<div><b>Purchasing Power Index (relative to U.S.)</b></div>';
    div.innerHTML += `<i style="background:${colorScale.range()[0]}"></i>${Math.round(d3.min(colorScale.domain()))}<br>`;
    
    for (let i = 0; i < grades.length; i++) {
      div.innerHTML += `<i style="background:${colorScale.range()[i+1]}"></i>${numberFormatting(grades[i])}<br>`;
    }

    return div;
  };
  legend.addTo(map);

  //Add the geojson layer with heatmap colors and hover info
  geojson = L.geoJson(geojsonData, {
    style: function(feature) {
      return {
        fillColor: colorScale(feature.properties.PPI),
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
      this._div.innerHTML = '<h4>Purchasing Power Index (relative to U.S.)</h4>' +  (props ?
          '<b>' + props.ADMIN + '</b><br />' + numberFormatting(props.PPI)
          : 'Hover over a country');
  };
  info.addTo(map);
}

//HOVER FEATURE

function highlightFeature(e) {
  
  var layer = e.target;

  if(layer.feature.properties.costIndex != undefined){
    layer.setStyle({
      weight: 4,
      color: '#e7037c',
      dashArray: '',
    });
  }

  /*
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
    PPI: ${numberFormatting(layer.feature.properties.PPI)}<br>

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
      unclick: resetHighlight,
  });

}

//HELPER FUNCTIONS

function dollarFormatting(value) {
  return Math.round(Number(value)).toLocaleString();
}

function numberFormatting(value) {
  return (Math.round(Number(value)*10)/10).toLocaleString();
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