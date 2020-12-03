
//todo prior to any framework, this method must be blocked by calling .preventDefault() in the capture phase.

//todo should echo much of the same functionality as the normal <form>.
//todo the form produces a GET post that will be opened in a popup window.
//todo have a fallback if popups are blocked. do we need to test if the ability is precent
//   https://stackoverflow.com/questions/2914/how-can-i-detect-if-a-browser-is-blocking-a-popup
//
//todo accept only text inside the link <a href='link'>text-only</a>, for now.

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
    //todo do we need this for missing attributeChangedCallback in Safari?
    requestAnimationFrame(() => requestAnimationFrame(() => this.updateLink()));
  }

  onClick(e) {
    e.preventDefault();
    ratechangeTick(() => this.singlePrettyPopup());
  }

  singlePrettyPopup() {
    if(!this.popup)
      this._popup = window.open(this.href, "_blank", popupParameters());
    if (this.popup.location !== this.href)
      this.popup.location = this.href;
    this.popup.focus();
  }

  //todo put the this._popup into WeakMaps
  get popup(){
    if (this._popup && !this._popup.closed)
      return this._popup;
    const group = this.getAttribute('group');
    if(!group)                   //null and empty is a void group.
      return undefined;
    for (let other of this.parentNode.querySelectorAll(`${this.tagName}[group=${group}]`)) {
      if(other._popup && !other._popup.closed)
        return this._popup = other._popup;
    }
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