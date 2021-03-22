//1. firstDeclarationWins
export const firstComeWins = {
  p_r: new WeakMap(),
  get: function (target, prop, receiver) {
    if (prop in target)                 //the target has a property
      return Reflect.get(...arguments); //simply return it
    let resolver;                                    //request made for a property not yet set
    const promise = new Promise(r => resolver = r);  //will make a new Promise
    Reflect.set(target, prop, promise);              //that is added to the firstWinsObject
    this.p_r.set(promise, resolver);                      //and that resolves when the prop on the
    return promise;                                  //firstWinsObject first resolves.
  },
  set: function (target, prop, value) {
    //1. the prop is already set and resolved? do nothing
    if (prop in target && !(target[prop] instanceof Promise))
      return true;

    //2. the new value is a promise? simply try again when the new value resolves
    if (value instanceof Promise)
      return value.then(newVal => this.set(target, prop, newVal)) && true; //target[prop] = newVal behaves like Reflect.get.

    //3. the prop is unset and the new value is resolved? just set it
    if (!(prop in target))
      return Reflect.set(target, prop, value);

    //4. The prop is a promise and the new value is resolved? 1. update target, 2. resolve awaiting promises.
    //at this point (target[prop] instanceof Promise && !(value instanceof Promise)) is always true
    const resolver = this.p_r.get(target[prop]);
    Reflect.set(target, prop, value);       //the firstWinsObject is always up to date,
    resolver(target[prop]);                 //before callbacks for the awaiting promises start
    return true;
  }
};

export function cloneResponseProxy(target) {
  return new Proxy(target, {
    get: function (target, prop, receiver) {
      const og = Reflect.get(target, prop, receiver);
      return og instanceof Response ? og.clone() : og;
    }
  })
}