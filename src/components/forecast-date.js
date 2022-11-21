class ForecastDate extends HTMLElement {
  constructor() {
    super();
    const templateElement = document.getElementById('forecast-date');
    const templateContent = templateElement.content;
    const shadowRoot = this.attachShadow({ mode: 'open' });

    shadowRoot.appendChild(templateContent.cloneNode(true));
  }

  connectedCallback() {
    const labelElement = this.shadowRoot.querySelector('label');
    this.inputElement = this.shadowRoot.querySelector('input');

    labelElement.addEventListener('click', this.open.bind(this));
    this.inputElement.addEventListener('change', () => {
      this.updateDate();
    });

    this.setToToday();

    window.addEventListener('keydown', (event) => {
      if (event.code === 'ArrowLeft') {
        this.setToPreviousDay();
      } else if (event.code === 'ArrowRight') {
        this.setToNextDay();
      }
    });

    if (navigator.userAgent.includes('Chrome')) {
      this.inputElement.classList.add('-browser-chrome');
    }
  }

  get value() {
    return this.inputElement.value;
  }

  setToPreviousDay() {
    const date = new Date(this.value);
    date.setTime(date.getTime() - (24 * 60 * 60 * 1000));

    this.inputElement.value = date.toISOString().substr(0, 10);
    this.updateDate();
  }

  setToNextDay() {
    const date = new Date(this.value);
    date.setTime(date.getTime() + (24 * 60 * 60 * 1000));

    this.inputElement.value = date.toISOString().substr(0, 10);
    this.updateDate();
  }

  setToToday() {
    const timezoneOffset = (new Date().getTimezoneOffset() * 60 * 1000) * -1;
    const datetime = new Date().getTime() + timezoneOffset;

    this.inputElement.value = new Date(datetime).toISOString().substr(0, 10);
    this.updateDate();
  }

  updateDate() {
    const updateEvent = new CustomEvent('update', {
      detail: {
        value: this.value,
      },
    });
    this.dispatchEvent(updateEvent);
  }

  open() {
    this.inputElement.focus();
    const event = document.createEvent('KeyboardEvent');
    event.initKeyboardEvent('keydown', true, true, document.defaultView, 'F4', 0);
    this.inputElement.dispatchEvent(event);
  }
}

window.customElements.define('forecast-date', ForecastDate);

export default ForecastDate;
