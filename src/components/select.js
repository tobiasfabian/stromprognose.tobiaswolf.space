class Select {
  constructor(element) {
    const labelElement = element.parentElement;

    this.element = element;

    labelElement.addEventListener('click', this.open.bind(this));
  }

  open() {
    const event = document.createEvent('MouseEvents');
    event.initMouseEvent('mousedown', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    this.element.dispatchEvent(event);
  }
}

document.querySelectorAll('select').forEach((element) => new Select(element));
