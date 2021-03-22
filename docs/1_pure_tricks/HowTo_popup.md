# HowTo: make a popup window 2020?

> "Most browsers block popups if they are called outside of user-triggered event handlers like onclick." [https://javascript.info/popup-windows](https://javascript.info/popup-windows)

Popups should be:
1. Short and temporary. The interaction in the popup is short and sweet and will end soon.
2. Non-destructive. The session in the popup can add state, but should not modify/remove any existing state in the original window.

## Why and when: popup?

There are many bad use-cases for popups. Advertisers can spam your desktop by creating multiple annoying popups. Users and thus browsers don't like this, and therefore multiple popups which do not originate from a user driven event such as `click` are blocked by default.
 
But. There exists some good use-cases for popups too, a.o. federated login where anonymous use is allowed. How is that? Well, federated login requires the browser to load at least *one* new webpage into the browser. If you load that new page in the same window, then the browser might wipe away any user state and text input in the old page. If the site allows/encourages use in anonymous state (such as writing text input while not logged in), then the user can in many instances have valuable state data in the active window. A user would therefore often be anxious about the prospect of loosing their data if they click on a login link in such a site.
 
It doesn't really matter if your app does everything correct in such an instance: a) save the user's current state in localstorage and then b) resurrect that state when the login interaction completes. Because the user cannot know that in advance. And the user cannot trust that your websites will do that, because many other websites don't. Therefore, careful users often prefer to actively "open (login) link in new tab", whenever possible and when they have valuable state in the current window. 

This has a consequence: **login links should be complete `<a href>`**, not `<button>`s in a `<form>` or triggers for javascript functions.

And this consequence has itself a consequence: login options such as **"remember me on this computer" should *alter* the login links directly** via js functions when they are clicked; to support "open (login) link in new tab", the complete link in `<a href>` should be made at *option-time*, not *navigation-time*. This might feel a bit iffy, as the DOM itself is used as the data structure, but done correctly it is a good compromise for popup login links.

## HowTo: make a popup link 1.

Pretty popups should be:
1) center of the screen,
2) not include navigation button, and 
3) be smaller than the original window, so that the original session can be seen as background for the popup window.

`<a href>` cannot create popups directly. To make a popup, you must use call `window.open(url, "_blank", popupParams)`, where the popupParams specify the `height` and `width` of the popup.

```javascript
function popupParameters(width = 600, height = 600) {
  width = Math.min(width, window.screen.width);   
  height = Math.min(height, window.screen.height);
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;
  return "resizable,scrollbars,status,opener," +  
    Object.entries({width, height, left, top}).map(kv => kv.join('=')).join(',');
}

function prettyPopup(url){
  open(url, "_blank", popupParameters());
}
```

## HowTo: avoid redundant popup windows?

If the user accidentally clicks several popup links, or forgets to close non-completed popup windows, you want to reuse the old popup window so no more than one login popup will ever exist per parent window. To solve this, we make a popup singleton.
        
```javascript
function popupParameters(width = 600, height = 600) {
  width = Math.min(width, window.screen.width);   
  height = Math.min(height, window.screen.height);
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;
  return "resizable,scrollbars,status,opener," +  
    Object.entries({width, height, left, top}).map(kv => kv.join('=')).join(',');
}

let popup;

function singlePrettyPopup(url){
  if (!popup || popup.closed){
    popup = window.open(url, "_blank", popupParameters());
    popup.focus();
//todo verify that there is an instance in a browser where this call to `focus()` is needed. 
  } else if(popup.location === url)
    popup.focus();
  else   
    popup.location = url;
}
```

## Demo: `index.html` and `popup.html`

`popup.html`
```html
<h1>Hello sunshine</h1>
```

`index.html`
```html
<a href="popup.html">open a popup</a>
<script>
  function popupParameters(width = 600, height = 600) {
    width = Math.min(width, window.screen.width);   
    height = Math.min(height, window.screen.height);
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    return "resizable,scrollbars,status,opener," +  
      Object.entries({width, height, left, top}).map(kv => kv.join('=')).join(',');
  }
  
  let popup;
  
  function singlePrettyPopup(url){
    if (!popup || popup.closed)                                   //[3]
      popup = window.open(url, "_blank", popupParameters());      //[4]
    else if(popup.location !== url)
      popup.location = url;
    popup.focus();                                                //[5]
  }

  const aPopupLink = document.querySelector("a");
  aPopupLink.addEventListener("click", function(e) {
    e.preventDefault();                                            //[1]
    const link = e.currentTarget.href;                             //[2]
    singlePrettyPopup(link);
  });
</script>
```
1. Prevent the `a` element default action to avoid page reloading.
2. Get the link from the link.
3. Check for popup singleton, and reuse it if possible.
4. If you need to open a new popup, use the pretty parameters.
5. Make sure the popup window is in `.focus()`.

## WebComp: `a-popup.js`

```javascript
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
    requestAnimationFrame(() => requestAnimationFrame(  //[3]
      () => this.updateLink()
    ));
  }
  onClick(e) {
    e.preventDefault();
    ratechangeTick(                                 //[1]
      () => singlePrettyPopup(this.href)            //[2]
    );
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
```

1. see [ratechangeTick]() 
2. see `singlePrettyPopup()`
3. ensures that no attributeChangedCallback is lost in Safari. todo check this out again and find reference from JoiEvents. or no, I think this is in JoiComponents.  

## Demo: working test with web comp and popup

```html
<script>
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

  customElements.define('a-popup', aPopup);
</script>
<a-popup href="login/google" href2="?remember-me">login</a-popup>
```

## Reference
* [MDN: pop-up features](https://developer.mozilla.org/en-US/docs/Web/API/Window/open#Toolbar_and_UI_parts_features)
* [wayback: javascript.info/popup-windows](https://web.archive.org/web/20201016094620/https://javascript.info/popup-windows)