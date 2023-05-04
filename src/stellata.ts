/*
  Authors: azazelm3dj3d (https://github.com/azazelm3dj3d), Jake Roseboro (https://github.com/jakeroseboro)
  License: GPL-v3
  
  Stellata (c) 2023
*/

((window: Window) => {
  const {
    screen: { width, height },
    navigator: { language },
    location,
    localStorage,
    document,
    history,
  } = window;
  const { hostname, pathname, search } = location;
  const { currentScript } = document;

  if (!currentScript) return;

  const _data = "data-";
  const _false = "false";
  const attr = currentScript.getAttribute.bind(currentScript);
  const website = attr(_data + "website-id");
  const hostUrl = attr(_data + "host-url")?.replace(/\/$/, '');
  const cssEvents = attr(_data + "css-events") !== _false;
  const endpoint = `${hostUrl}/ingestion`;
  const screen = `${width}x${height}`;
  const eventClass = /^stellata--([a-z]+)--([\w]+[\w-]*)$/;
  const eventSelect = "[class*='stellata--']";
  const listeners: Record<string, any> = {};
  let currentUrl = `${pathname}${search}`;
  let currentRef = document.referrer;

  interface payload {
    eventType: string,
    websiteId: string,
    hostname: string,
    screen: string,
    language: string,
    url: string,
    referrer: string
  }

  // Determine if the user has tracking disabled
  const trackingEnabled = () => {
    const { doNotTrack, navigator, external } = window;

    const msTrackProtection = "msTrackingProtectionEnabled";
    const msTracking = () => {
      return (
        external &&
        msTrackProtection in external &&
        external[msTrackProtection]()
      );
    };

    const dntByLocalStorage =
      localStorage && localStorage.getItem("stellata.disabled") === "true";

    const dnt =
      doNotTrack ||
      navigator.doNotTrack ||
      navigator.msDoNotTrack ||
      msTracking();
    const dntEnabled = dnt == "1" || dnt == "yes";
    const dntByTag = attr(_data + "do-not-track") === "true";

    const autoTrack = attr(_data + "auto-track") !== "false";

    const domain = attr(_data + "domains");
    const domains = domain !== null ? domain.split(",").map((n) => n.trim()) : [];

    const dntByDomains = domains.length > 0 ? !domains.includes(hostname) : false;

    return (
      autoTrack &&
      !(dntEnabled || dntByTag || dntByLocalStorage || dntByDomains)
    );
  };

  const collect = (eventType: string | undefined) => {
    if (!trackingEnabled()) return;
    if (website === null) return;
    if (eventType === undefined) return;

    const payload: payload = {
      eventType,
      websiteId: website,
      hostname,
      screen,
      language,
      url: currentUrl,
      referrer: currentRef
    }

    fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ payload }),
      headers: { 'Content-Type': 'application/json' }
    })
      .then((res) => { return res.text(); })
      .catch((error) => { return error })
  };

  const addEvents = (node: Document) => {
    const elements = node.querySelectorAll(eventSelect);

    elements.forEach((element) => {
      const get = element.getAttribute.bind(element);
      (get("class") || "").split(" ").forEach((className: string) => {
        if (!eventClass.test(className)) return;

        const [, event, name] = className.split("--");
        if (event === undefined || name === undefined) return;

        const listener = listeners[className]
          ? listeners[className]
          : (listeners[className] = (e: {
            ctrlKey: any;
            shiftKey: any;
            metaKey: any;
            button: number;
            preventDefault: () => void;
          }) => {
            if (
              event === "click" &&
              element.tagName === "A" &&
              !(
                e.ctrlKey ||
                e.shiftKey ||
                e.metaKey ||
                (e.button && e.button === 1) ||
                get("target")
              )
            ) {
              e.preventDefault();
              collect(name)
              const href = get("href");
              if (href) {
                location.href = href;
              }
            } else {
              collect(name);
            }
          });

        element.addEventListener(event, listener, true);
      });
    });
  };

  const observeDocument = () => {
    const monitorMutate = (mutations: any[]) => {
      mutations.forEach((mutation: { target: any }) => {
        const element = mutation.target;
        addEvents(element);
      });
    };

    const observer = new MutationObserver(monitorMutate);
    observer.observe(document, { childList: true, subtree: true });
  };

  const hook = (_this: History, method: string) => {
    const orig = method === 'pushState' ? _this.pushState : _this.replaceState;

    return (...args: any) => {

      handlePush(...args);

      return orig.apply(_this, args);
    };
  };

  const handlePush = (...args: any) => {
    if (!args.url) return;

    currentRef = currentUrl;
    const newUrl = args.url.toString();

    if (newUrl.substring(0, 4) === 'http') {
      currentUrl = '/' + newUrl.split('/').splice(3).join('/');
    } else {
      currentUrl = newUrl;
    }

    if (currentUrl !== currentRef) {
      collect("pageView");
    }
  };

  if (!window.stellata) {
    const stellata = (eventValue: string) => collect(eventValue);
    stellata.collect = collect;

    window.stellata = stellata;
  }

  if (trackingEnabled()) {
    history.pushState = hook(history, 'pushState');
    history.replaceState = hook(history, 'replaceState');

    const update = () => {
      if (document.readyState === 'complete') {
        collect('pageView');

        if (cssEvents) {
          addEvents(document);
          observeDocument();
        }
      }
    };

    document.addEventListener('readystatechange', update, true);

    update();
  }
})(window);

export { }
