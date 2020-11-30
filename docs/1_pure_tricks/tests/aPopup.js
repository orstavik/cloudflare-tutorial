function ratechangeTick(cb) {
  var audio = document.createElement("audio");
  audio.onratechange = cb;
  audio.playbackRate = 2;
}

function popupParameters(width = 600, height = 600) {
  width = Math.min(width, window.screen.width);
  height = Math.min(height, window.screen.height);
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;
  return "resizable,scrollbars,status,opener," +
    Object.entries({width, height, left, top}).map(kv => kv.join('=')).join(',');
}

let popup;

function singlePrettyPopup(url) {
  if (!popup || popup.closed)                                   //[3]
    popup = window.open(url, "_blank", popupParameters());      //[4]
  else if (popup.location !== url)
    popup.location = url;
  popup.focus();                                                //[5]
}

class aPopup extends HTMLElement {

  static get observedAttributes() {
    return ['href', 'href2'];
  }

  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = `<a><slot></slot></a>`;
    //todo relies on capture phase prevent default.
    this.addEventListener('click', e => this.onClick(e));
    requestAnimationFrame(() => requestAnimationFrame(() => this.updateLink()));
  }

  onClick(e) {
    e.preventDefault();
    ratechangeTick(() => singlePrettyPopup(this.href));
  }

  get href() {
    return this.shadowRoot.children[0].href;
  }

  updateLink() {
    const a = this.shadowRoot.children[0];
    const href = this.getAttribute('href');
    const href2 = this.getAttribute('href2') || '';
    href === null ? a.removeAttribute('href') : a.setAttribute('href', href + href2);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'href' || name === 'href2')
      this.updateLink();
  }
}