import { dsvFormat } from 'd3';
import './components/select.js';
import './components/forecast-summary.js';
import './components/forecast-date.js';
import './components/forecast-region.js';
import graph from './components/graph.js';

const endpoint = '/data.php';
const storage = {
  data: {},
  date: null,
  region: null,
};

// elements
const forecastSummary = document.querySelector('forecast-summary');
const { forecastDate, forecastRegion } = forecastSummary;

/**
 * Example:
 * row['Datum‘] = 28.10.2022
 * row['Uhrzeit‘] = 18:00
 * row['Gesamt[MWh]‘] = 53.511 (only on the hour, otherwise “-”)
 * row['Photovoltaik und Wind[MWh]‘] = 1.082
 * row['Wind Offshore[MWh]‘] = 317
 * row['Wind Onshore[MWh]‘] = 514
 * row['Photovoltaik[MWh]‘] = 251
 * row['Sonstige[MWh]‘] = 49.760 (only on the hour, otherwise “-”)
 */
const prepareRow = (row) => {
  const newRow = row;
  const dateString = newRow.Datum;
  const timeString = newRow.Uhrzeit ?? newRow.Anfang;
  const year = dateString.split('.')[2];
  const month = dateString.split('.')[1];
  const day = dateString.split('.')[0];
  // const offset = '-00:00';
  const iso8601String = `${year}-${month}-${day}T${timeString}:00.000`;
  const date = new Date(iso8601String);

  newRow.date = date;

  return newRow;
};

const parseCsv = (body) => new Promise((resolve) => {
  const dsv = dsvFormat(';');
  const data = dsv.parse(body, prepareRow);
  resolve(data);
});

const fetchData = async (from, to, requestData) => {
  const response = await fetch(endpoint, {
    body: JSON.stringify(requestData),
    method: 'post',
    mode: 'same-origin',
    cache: 'force-cache',
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
    },
  });
  const body = await response.text();
  return parseCsv(body);
};

const mergeData = (data1, data2) => data1.map((row, index) => {
  const data2Row = data2.find((item) => (
    item.date.toISOString() === data1[index].date.toISOString()
  ));
  return Object.assign(row, data2Row ?? {});
});

// Parse german number
const parseNumber = (numberString) => {
  const number = parseFloat(numberString.replace('.', ''));
  return Number.isNaN(number) ? 0 : number;
};

const refineRow = (row) => {
  const refinedRow = row;
  if ('Photovoltaik und Wind[MWh]' in row) {
    refinedRow.renewable = parseNumber(row['Photovoltaik und Wind[MWh]']);
  }
  if ('Photovoltaik[MWh]' in row) {
    refinedRow.photovoltaic = parseNumber(row['Photovoltaik[MWh]']);
  }
  if ('Gesamt (Netzlast)[MWh]' in row) {
    refinedRow.total = parseNumber(row['Gesamt (Netzlast)[MWh]']);
  }
  if ('Wind Offshore[MWh]' in row) {
    refinedRow.windOffshore = parseNumber(row['Wind Offshore[MWh]']);
  }
  if ('Wind Onshore[MWh]' in row) {
    refinedRow.windOnshore = parseNumber(row['Wind Onshore[MWh]']);
  }
  if ('windOffshore' in row && 'windOnshore' in row) {
    refinedRow.wind = refinedRow.windOffshore + refinedRow.windOnshore;
  }
  if ('renewable' in row && 'total' in row) {
    refinedRow.percentRenewable = refinedRow.renewable / refinedRow.total;
  }

  return refinedRow;
};

const fetchForecastedConsumption = (from, to, region) => {
  const requestData = {
    request_form: [
      {
        format: 'CSV',
        moduleIds: [6000411, 6004362],
        region,
        timestamp_from: from,
        timestamp_to: to,
        type: 'discrete',
        language: 'de',
      },
    ],
  };
  return fetchData(from, to, requestData);
};

const fetchForecastedProduction = (from, to, region) => {
  const requestData = {
    request_form: [
      {
        format: 'CSV',
        moduleIds: [2005097, 2000125, 2003791, 2000123],
        region,
        timestamp_from: from,
        timestamp_to: to,
        type: 'discrete',
        language: 'de',
      },
    ],
  };
  return fetchData(from, to, requestData);
};

const loadData = async () => {
  graph.loading = true;
  forecastSummary.loading = true;

  const { date, region } = storage;
  const timezoneOffset = (new Date(date).getTimezoneOffset() * 60 * 1000) * -1;
  const datetime = new Date(date).getTime() - timezoneOffset;
  const from = datetime; // e.g. 1665439200000
  const to = datetime + (24 * 60 * 60 * 1000);
  const forecastedProduction = await fetchForecastedProduction(from, to, region);
  const forecastedConsumption = await fetchForecastedConsumption(from, to, region);
  storage.data = mergeData(
    forecastedProduction,
    forecastedConsumption,
  ).map(refineRow);

  graph.update(storage.data);
  forecastSummary.update(storage.data);
  graph.loading = false;
  forecastSummary.loading = false;
};

// add event listner
forecastDate.addEventListener('update', (event) => {
  storage.date = event.detail.value;
  loadData();
});
forecastRegion.addEventListener('update', (event) => {
  storage.region = event.detail.value;
  loadData();
});

// init
storage.date = forecastDate.value;
storage.region = forecastRegion.value;
loadData();
