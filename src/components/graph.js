import * as d3 from 'd3';

class Graph {
  constructor() {
    // variables
    this.endpoint = '/data.php';
    this.margin = {
      x: {
        start: 70,
        end: 0,
      },
      y: {
        start: 0,
        end: 20,
      },
    };
    this.colors = {
      gray_400: '#ccc',
      gray_600: '#777',
      yellow_400: '#f0c674',
      yellow_600: '#cca000',
      green_400: '#a7bd68',
      green_600: '#5d800d',
      aqua_400: '#8abeb7',
      aqua_600: '#398e93',
      blue_400: '#7e9abf',
      blue_600: '#4271ae',
      purple_400: '#b294bb',
      purple_600: '#9c48b9',
    };
    this.numberFormat = new Intl.NumberFormat('de-DE', {
      maximumFractionDigits: 0,
    });
    this.dateTimeFormat = new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    this.width = null;
    this.height = null;
    this.svg = null;
    this.data = null;
    this.x = null;

    // dom elements
    this.dateElement = document.querySelector('input[name="date"]');
    this.regionElement = document.querySelector('select[name="region"]');
    this.graphElement = document.querySelector('#graph');
    this.graphInfoElement = document.querySelector('#graph_info');
    this.tableElement = document.querySelector('#table');

    // functions
    this.onMouseover = () => {
      this.graphInfoElement.style = 'visibility: visible';
    };
    this.onMousemove = (event) => {
      const {
        data,
        x,
        numberFormat,
        dateTimeFormat,
      } = this;
      const bisect = d3.bisector((d) => d.date).left;
      const xPos = d3.pointer(event)[0];
      const x0 = bisect(data, x.invert(xPos));
      const d0 = data[x0];

      this.graphInfoElement.innerHTML = `
        <strong>
          ${dateTimeFormat.format(d0.date)}
        </strong>
        <strong style="color: ${this.colors.gray_600}">
          Gesamt (Netzlast): ${numberFormat.format(d0.total)} MWh
        </strong>
        <strong style="color: ${this.colors.purple_600}">
          Anteil Erneuerbare: ${numberFormat.format(d0.percentRenewable * 100)}%
        </strong>
        <strong style="color: ${this.colors.yellow_600}">
          Photovoltaik: ${numberFormat.format(d0.photovoltaic)} MWh
        </strong>
        <strong style="color: ${this.colors.blue_600}">
          Wind: ${numberFormat.format(d0.wind)} MWh
        </strong>
        <div style="color: ${this.colors.blue_600}; padding-inline-start: 1em;">
          Wind Onshore: ${numberFormat.format(d0.windOnshore)} MWh
        </div>
        <div style="color: ${this.colors.aqua_600}; padding-inline-start: 1em;">
          Wind Offshore: ${numberFormat.format(d0.windOffshore)} MWh
        </div>
      `;
    };
    this.onMouseleave = () => {
      this.graphInfoElement.style = 'visibility: hidden';
    };
    this.onResize = () => {
      this.width = this.graphElement.offsetWidth;
      this.height = this.graphElement.offsetHeight;
      this.widthSvg = this.width - this.margin.x.start - this.margin.x.end;
      this.heightSvg = this.height - this.margin.y.start - this.margin.y.end;
      d3.select('#graph svg')
        .attr('width', this.width)
        .attr('height', this.height);
      this.draw();
    };
    this.mergeData = (data1, data2) => data1.map((row, index) => {
      const data2Row = data2.find((item) => (
        item.date.toISOString() === data1[index].date.toISOString()
      ));
      return Object.assign(row, data2Row ?? {});
    });
    // Parse german number
    this.parseNumber = (numberString) => {
      const number = parseFloat(numberString.replace('.', ''));
      return Number.isNaN(number) ? 0 : number;
    };

    // event listener
    this.dateElement.addEventListener('change', () => {
      this.date = this.dateElement.value;
      this.loadData();
    });
    this.regionElement.addEventListener('change', () => {
      this.region = this.regionElement.value;
      this.loadData();
    });
    window.addEventListener('resize', this.onResize.bind(this));

    // init
    this.width = this.graphElement.offsetWidth;
    this.height = this.graphElement.offsetHeight;
    this.widthSvg = this.width - this.margin.x.start - this.margin.x.end;
    this.heightSvg = this.height - this.margin.y.start - this.margin.y.end;
    this.initSvg();
    this.setDateElementToToday();
    this.date = this.dateElement.value;
    this.region = this.regionElement.value;
    this.loadData();
  }

  draw() {
    const {
      data,
      svg,
      widthSvg,
      heightSvg,
      numberFormat,
    } = this;
    console.log('draw', data);

    svg.selectAll('*').remove();

    this.x = d3.scaleTime()
      .domain(d3.extent(data, (d) => d.date))
      .range([0, widthSvg]);

    // Add Y axis
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d.total)])
      // .domain([0, 17000])
      .range([heightSvg, 0]);

    this.drawTotals(y);
    this.drawRenewables(y);
    this.drawPercentRenewable();

    svg.append('g')
      .attr('transform', `translate(0,${heightSvg})`)
      .call(d3.axisBottom(this.x)
        .ticks(d3.timeHour.every(2))
        .tickFormat((d) => `${d.getHours()} Uhr`));
    svg.append('g')
      .call(d3.axisLeft(y)
        .ticks(null)
        .tickFormat((d) => `${numberFormat.format(d)} MWh`));
  }

  drawPercentRenewable() {
    const { heightSvg, x, data } = this;

    // Add Y axis
    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([heightSvg, 0]);

    this.svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', this.colors.purple_600)
      .attr('stroke-dasharray', '5,5')
      .attr('stroke-width', 2)
      .attr('d', d3.line()
        .x((d) => x(d.date))
        .y((d) => y(d.percentRenewable)));
  }

  drawRenewables(y) {
    const { data, x, svg } = this;
    // Add the line Photovoltaics
    svg.append('path')
      .datum(data)
      .attr('fill', this.colors.yellow_400)
      .attr('stroke', this.colors.yellow_600)
      .attr('stroke-width', 2)
      .attr('d', d3.area()
        .x((d) => x(d.date))
        .y0((d) => y(d.wind))
        .y1((d) => y(d.photovoltaic + d.wind)));

    // Add the line Wind Offshore
    svg.append('path')
      .datum(data)
      .attr('fill', this.colors.aqua_400)
      .attr('stroke', this.colors.aqua_600)
      .attr('stroke-width', 2)
      .attr('d', d3.area()
        .x((d) => x(d.date))
        .y0(y(0))
        .y1((d) => y(d.windOffshore)));

    // Add the line Wind Onshore
    svg.append('path')
      .datum(data)
      .attr('fill', this.colors.blue_400)
      .attr('stroke', this.colors.blue_600)
      .attr('stroke-width', 2)
      .attr('d', d3.area()
        .x((d) => x(d.date))
        .y0((d) => y(d.windOffshore))
        .y1((d) => y(d.windOffshore + d.windOnshore)));
  }

  drawTotals(y) {
    const { data, x } = this;

    // Add the line
    this.svg.append('path')
      .datum(data)
      .attr('fill', this.colors.gray_400)
      .attr('stroke', this.colors.gray_600)
      .attr('stroke-width', 2)
      .attr('d', d3.area()
        .x((d) => x(d.date))
        .y0(y(0))
        .y1((d) => y(d.total)));
  }

  generateTable() {
    const {
      data,
      tableElement,
      numberFormat,
      dateTimeFormat,
    } = this;

    const columns = {
      date: 'Datum',
      total: 'Gesamt (Netzlast)',
      photovoltaic: 'Photovoltaik',
      wind: 'Wind',
      windOnshore: 'Wind Onshore ',
      windOffshore: 'Wind Offshore ',
      percentRenewable: 'Anteil Erneuerbare',
    };

    let html = '';

    html += '<thead><tr>';
    Object.values(columns).forEach((column) => {
      html += `<th>${column}</th>`;
    });
    html += '</tr></thead>';

    data.forEach((datum) => {
      html += '<tr>';
      Object.keys(columns).forEach((key) => {
        if (!Number.isNaN(datum[key])) {
          let string = '';
          if (key === 'date') {
            string = dateTimeFormat.format(datum[key]);
            html += `<th>${string}</th>`;
          } else if (key === 'percentRenewable') {
            string = numberFormat.format(datum[key] * 100);
            html += `<td>${string} %</td>`;
          } else {
            string = numberFormat.format(datum[key]);
            html += `<td>${string} KWh</td>`;
          }
        }
      });
      html += '</tr>';
    });

    tableElement.innerHTML = html;
  }

  refineRow(row) {
    const refinedRow = row;
    if ('Photovoltaik und Wind[MWh]' in row) {
      refinedRow.renewable = this.parseNumber(row['Photovoltaik und Wind[MWh]']);
    }
    if ('Photovoltaik[MWh]' in row) {
      refinedRow.photovoltaic = this.parseNumber(row['Photovoltaik[MWh]']);
    }
    if ('Gesamt (Netzlast)[MWh]' in row) {
      refinedRow.total = this.parseNumber(row['Gesamt (Netzlast)[MWh]']);
    }
    if ('Wind Offshore[MWh]' in row) {
      refinedRow.windOffshore = this.parseNumber(row['Wind Offshore[MWh]']);
    }
    if ('Wind Onshore[MWh]' in row) {
      refinedRow.windOnshore = this.parseNumber(row['Wind Onshore[MWh]']);
    }
    if ('windOffshore' in row && 'windOnshore' in row) {
      refinedRow.wind = refinedRow.windOffshore + refinedRow.windOnshore;
    }
    if ('renewable' in row && 'total' in row) {
      refinedRow.percentRenewable = refinedRow.renewable / refinedRow.total;
    }

    return refinedRow;
  }

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
  prepareRow(row) {
    const newRow = row;
    const dateString = newRow.Datum;
    const timeString = newRow.Uhrzeit;
    const year = dateString.split('.')[2];
    const month = dateString.split('.')[1];
    const day = dateString.split('.')[0];
    // const offset = '-00:00';
    const iso8601String = `${year}-${month}-${day}T${timeString}:00.000`;
    const date = new Date(iso8601String);

    newRow.date = date;

    return newRow;
  }

  async loadData() {
    const { date, region } = this;
    const datetime = new Date(date).getTime() - (2 * 60 * 60 * 1000);
    const from = datetime; // e.g. 1665439200000
    const to = datetime + (24 * 60 * 60 * 1000);
    const forecastedProduction = await this.fetchForecastedProduction(from, to, region);
    const forecastedConsumption = await this.fetchForecastedConsumption(from, to, region);
    this.data = this.mergeData(
      forecastedProduction,
      forecastedConsumption,
    ).map(this.refineRow.bind(this));
    this.draw();
    this.generateTable();
  }

  fetchForecastedConsumption(from, to, region) {
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
    return this.fetchData(from, to, requestData);
  }

  fetchForecastedProduction(from, to, region) {
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
    return this.fetchData(from, to, requestData);
  }

  fetchData(from, to, requestData) {
    return new Promise(async (resolve, reject) => {
      const response = await fetch(this.endpoint, {
        body: JSON.stringify(requestData),
        method: 'post',
        mode: 'same-origin',
        cache: 'force-cache',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
        },
      });
      const body = await response.text();
      const dsv = d3.dsvFormat(';');
      const data = dsv.parse(body, this.prepareRow.bind(this));
      resolve(data);
    });
  }

  setDateElementToToday() {
    const date = new Date();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    this.dateElement.value = `${year}-${month}-${day}`;
  }

  initSvg() {
    this.svg = d3.select('#graph')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .attr('transform', `translate(${this.margin.x.start}, ${this.margin.y.start})`)
      .on('mouseover', this.onMouseover.bind(this))
      .on('mousemove', this.onMousemove.bind(this))
      .on('mouseleave', this.onMouseleave.bind(this));
  }
}

new Graph();
