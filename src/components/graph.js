import * as d3 from 'd3';

class Graph {
  storage = {};

  constructor() {
    // variables
    this.margin = {
      x: {
        start: -1,
        end: -1,
      },
      y: {
        start: 30,
        end: 30,
      },
    };
    this.numberFormat = new Intl.NumberFormat('de-DE', {
      maximumFractionDigits: 0,
    });
    this.timeFormat = new Intl.DateTimeFormat('de-DE', {
      timeStyle: 'short',
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
    this.graphElement = document.querySelector('#graph');
    this.loadingIndicatorElement = document.querySelector('.loading-indicator');
    this.graphInfoElement = document.querySelector('#graph_info');
    this.tableElement = document.querySelector('#table');

    // functions
    this.onMouseover = () => {
      this.graphInfoElement.style = 'visibility: visible';
    };
    this.onMousemove = (event) => {
      event.preventDefault();
      const {
        data,
        x,
        numberFormat,
        timeFormat,
      } = this;
      const bisect = d3.bisector((d) => d.date).left;
      const xPos = d3.pointer(event)[0];
      const x0 = bisect(data, x.invert(xPos));
      const d0 = data[x0];

      this.graphInfoElement.innerHTML = `
        <strong>
          ${timeFormat.format(d0.date)}
        </strong>
        <strong style="color: var(--color--gray-600)">
          Gesamt (Netzlast): ${numberFormat.format(d0.total)} MWh
        </strong>
        <strong style="color: var(--color--purple-600)">
          Anteil Erneuerbare: ${numberFormat.format(d0.percentRenewable * 100)}%
        </strong>
        <strong style="color: var(--color--yellow-600)">
          Photovoltaik: ${numberFormat.format(d0.photovoltaic)} MWh
        </strong>
        <strong style="color: var(--color--blue-600)">
          Wind: ${numberFormat.format(d0.wind)} MWh
        </strong>
        <div style="color: var(--color--blue-600); padding-inline-start: 1em;">
          Wind Onshore: ${numberFormat.format(d0.windOnshore)} MWh
        </div>
        <div style="color: var(--color--acqua-600); padding-inline-start: 1em;">
          Wind Offshore: ${numberFormat.format(d0.windOffshore)} MWh
        </div>
      `;
    };
    this.onMouseleave = () => {
      this.graphInfoElement.style = 'visibility: hidden';
    };
    this.onResize = () => {
      this.updateSizes();
      this.draw();
    };

    // event listener
    window.addEventListener('resize', this.onResize.bind(this));

    // init
    this.updateSizes();
    this.initSvg();
  }

  set loading(value) {
    this.graphElement.classList.toggle('-loading', value);
    this.loadingIndicatorElement.toggleAttribute('hidden', !value);
    this.graphInfoElement.classList.toggle('-loading', value);
    this.storage.loading = value;
  }

  get loading() {
    return this.storage.loading;
  }

  updateSizes() {
    this.width = this.graphElement.offsetWidth;
    this.height = this.graphElement.offsetHeight;
    this.widthSvg = this.width - this.margin.x.start - this.margin.x.end;
    this.heightSvg = this.height - this.margin.y.start - this.margin.y.end;
    d3.select('#graph svg')
      .attr('width', this.width)
      .attr('height', this.height);
  }

  update(data) {
    this.data = data;
    this.updateSizes();
    this.draw();
    this.generateTable();
  }

  draw() {
    const {
      svg,
      data,
      widthSvg,
      heightSvg,
    } = this;

    svg.selectAll('*').remove();

    this.x = d3.scaleTime()
      .domain(d3.extent(data, (d) => d.date))
      .range([0, widthSvg]);

    // Add Y axis
    this.y = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d.total)])
      // .domain([0, 17000])
      .range([heightSvg, 0]);

    this.drawTotals();
    this.drawRenewables();
    this.drawPercentRenewable();
    this.drawLegends();
  }

  drawLegends() {
    const {
      svg,
      x,
      y,
      heightSvg,
      widthSvg,
      numberFormat,
    } = this;

    svg.append('g')
      .call(d3.axisBottom(x)
        .ticks(d3.timeHour.every(4))
        .tickSize(heightSvg)
        .tickPadding(10)
        .tickFormat((d) => `${d.getHours()} Uhr`))
      .call((g) => g.selectAll('.tick line')
        .attr('stroke-opacity', 0.3)
        .attr('stroke-dasharray', '2,2'))
      .call((g) => g.select('.domain')
        .remove())
      .call((g) => g.selectAll('.tick text')
        .attr('x', 20));

    svg.append('g')
      .call(d3.axisRight(y)
        .ticks(5)
        .tickSize(widthSvg)
        .tickFormat((d, i, elements) => {
          const number = numberFormat.format(d);
          if (i === 0) {
            return null;
          }
          return i !== elements.length - 1 ? number : `${number} MWh`;
        }))
      .call((g) => g.select('.domain')
        .remove())
      .call((g) => g.select('.tick:first-of-type')
        .remove())
      .call((g) => g.selectAll('.tick line')
        .attr('stroke-opacity', 0.3)
        .attr('stroke-dasharray', '2,2'))
      .call((g) => g.selectAll('.tick text')
        .attr('x', 3)
        .attr('dy', -6));
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
      .attr('style', 'stroke: var(--color--purple-600)')
      .attr('stroke-dasharray', '5,5')
      .attr('stroke-width', 2)
      .attr('d', d3.line()
        .x((d) => x(d.date))
        .y((d) => y(d.percentRenewable)));
  }

  drawRenewables() {
    const {
      data, x, y, svg,
    } = this;
    // Add the line Photovoltaics
    svg.append('path')
      .datum(data)
      .attr('style', 'fill: var(--color--yellow-400); stroke: var(--color--yellow-600)')
      .attr('stroke-width', 2)
      .attr('d', d3.area()
        .x((d) => x(d.date))
        .y0((d) => y(d.wind))
        .y1((d) => y(d.photovoltaic + d.wind)));

    // Add the line Wind Offshore
    svg.append('path')
      .datum(data)
      .attr('style', 'fill: var(--color--acqua-400); stroke: var(--color--acqua-600')
      .attr('stroke-width', 2)
      .attr('d', d3.area()
        .x((d) => x(d.date))
        .y0(y(0))
        .y1((d) => y(d.windOffshore)));

    // Add the line Wind Onshore
    svg.append('path')
      .datum(data)
      .attr('style', 'fill: var(--color--blue-400); stroke: var(--color--blue-600)')
      .attr('stroke-width', 2)
      .attr('d', d3.area()
        .x((d) => x(d.date))
        .y0((d) => y(d.windOffshore))
        .y1((d) => y(d.windOffshore + d.windOnshore)));
  }

  drawTotals() {
    const { data, x, y } = this;

    // Add the line
    this.svg.append('path')
      .datum(data)
      .attr('style', 'fill: var(--color--gray-400); stroke: var(--color--gray-600)')
      .attr('stroke-width', 2)
      .attr('d', d3.area()
        .x((d) => x(d.date))
        .y0(y(0))
        .y1((d) => y(d.total)));
  }

  generateTable() {
    const {
      tableElement,
      data,
      numberFormat,
      timeFormat,
    } = this;

    const columns = {
      date: 'Uhrzeit',
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
            string = timeFormat.format(datum[key]);
            html += `<th>${string}</th>`;
          } else if (key === 'percentRenewable') {
            string = numberFormat.format(datum[key] * 100);
            html += `<td>${string} %</td>`;
          } else {
            string = numberFormat.format(datum[key]);
            html += `<td>${string} MWh</td>`;
          }
        }
      });
      html += '</tr>';
    });

    tableElement.innerHTML = html;
  }

  initSvg() {
    this.svg = d3.select('#graph')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .attr('transform', `translate(${this.margin.x.start}, ${this.margin.y.start})`)
      .on('mouseover', this.onMouseover.bind(this))
      // .on('touchstart', this.onMouseover.bind(this))
      .on('mousemove', this.onMousemove.bind(this))
      // .on('touchmove', this.onMousemove.bind(this))
      .on('mouseleave', this.onMouseleave.bind(this));
  }
}

export default new Graph();
