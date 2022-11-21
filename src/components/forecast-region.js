class ForecastRegion extends HTMLElement {
  constructor() {
    super();
    const templateElement = document.getElementById('forecast-region');
    const templateContent = templateElement.content;
    const shadowRoot = this.attachShadow({ mode: 'open' });

    shadowRoot.appendChild(templateContent.cloneNode(true));
  }

  connectedCallback() {
    const labelElement = this.shadowRoot.querySelector('label');
    this.inputElement = this.shadowRoot.querySelector('select');
    this.textElement = this.shadowRoot.querySelector('.text');

    labelElement.addEventListener('click', this.open.bind(this));
    this.inputElement.addEventListener('change', () => {
      this.updateRegion();
    });
  }

  get value() {
    return this.inputElement.value;
  }

  get text() {
    return this.inputElement.querySelector(`[value="${this.value}"]`).dataset.text;
  }

  updateText() {
    this.textElement.innerText = this.text;
  }

  updateRegion() {
    this.updateText();
    const updateEvent = new CustomEvent('update', {
      detail: {
        value: this.value,
      },
    });
    this.dispatchEvent(updateEvent);
  }

  open() {
    const event = document.createEvent('MouseEvents');
    event.initMouseEvent('mousedown', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    this.inputElement.dispatchEvent(event);
  }
}

window.customElements.define('forecast-region', ForecastRegion);

export default ForecastRegion;
