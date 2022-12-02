class ForecastSummary extends HTMLElement {
  storage = {};

  constructor() {
    super();
    const templateElement = document.getElementById('forecast-summary');
    const templateContent = templateElement.content;

    this.numberFormatPercent = new Intl.NumberFormat('de-DE', {
      style: 'percent',
      maximumFractionDigits: 0,
    });

    // https://stackoverflow.com/questions/57565794/how-would-you-turn-a-javascript-variable-into-a-template-literal#57565813
    this.interpolate = (str, obj) => str.replace(
      /\${([^}]+)}/g,
      (_, prop) => obj[prop],
    );

    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(templateContent.cloneNode(true));
  }

  connectedCallback() {
    this.element = this.shadowRoot.querySelector('.forecast-summary');
    this.forecastDate = this.shadowRoot.querySelector('forecast-date');
    this.forecastRegion = this.shadowRoot.querySelector('forecast-region');
    this.averageSlot = this.shadowRoot.querySelector('slot[name="average"]');
    this.maxSlot = this.shadowRoot.querySelector('slot[name="max"]');
    this.minSlot = this.shadowRoot.querySelector('slot[name="min"]');

    this.maxSlotTemplateString = this.maxSlot.innerHTML;
    this.minSlotTemplateString = this.minSlot.innerHTML;

    this.update();
  }

  set loading(value) {
    this.element.classList.toggle('-loading', value);
    if (value === true) {
      this.data = null;
    }
    this.storage.loading = value;
  }

  get loading() {
    return this.storage.loading;
  }

  get average() {
    if (!this.data) {
      return 0;
    }
    let sum = 0;
    this.data.forEach((item) => {
      sum += item.percentRenewable;
    });
    return (sum / this.data.length);
  }

  get minMaxIndex() {
    const { data } = this;
    let minIndex = 0;
    let minValue = data[0].percentRenewable;
    let maxIndex = minIndex;
    let maxValue = minValue;
    data.forEach((item, index) => {
      if (item.percentRenewable > maxValue) {
        maxIndex = index;
        maxValue = item.percentRenewable;
      }
      if (item.percentRenewable < minValue) {
        minIndex = index;
        minValue = item.percentRenewable;
      }
    });
    return {
      minIndex,
      maxIndex,
    };
  }

  get maxIndex() {
    return this.minMaxIndex.maxIndex;
  }

  get minIndex() {
    return this.minMaxIndex.minIndex;
  }

  get averageText() {
    return this.numberFormatPercent.format(this.average);
  }

  get minText() {
    let time = '00:00 Uhr';
    let percent = this.numberFormatPercent.format(0);
    if (this.data) {
      const minItem = this.data[this.minIndex];
      time = `${minItem.Anfang} Uhr`;
      percent = this.numberFormatPercent.format(minItem.percentRenewable);
    }
    return this.interpolate(this.minSlotTemplateString, {
      time,
      percent,
    });
  }

  get maxText() {
    let time = '00:00 Uhr';
    let percent = this.numberFormatPercent.format(0);
    if (this.data) {
      const maxItem = this.data[this.maxIndex];
      time = `${maxItem.Anfang} Uhr`;
      percent = this.numberFormatPercent.format(maxItem.percentRenewable);
    }
    return this.interpolate(this.maxSlotTemplateString, {
      time,
      percent,
    });
  }

  update(data) {
    this.data = data;
    this.averageSlot.innerText = this.averageText;
    this.maxSlot.innerHTML = this.maxText;
    this.minSlot.innerHTML = this.minText;
  }
}

window.customElements.define('forecast-summary', ForecastSummary);

export default ForecastSummary;
