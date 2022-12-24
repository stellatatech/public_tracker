"use strict";
(function (window) {
    var _a;
    var _b = window.screen, width = _b.width, height = _b.height, language = window.navigator.language, location = window.location, localStorage = window.localStorage, document = window.document, history = window.history;
    var hostname = location.hostname, pathname = location.pathname, search = location.search;
    var currentScript = document.currentScript;
    if (!currentScript)
        return;
    var _data = "data-";
    var _false = "false";
    var attr = currentScript.getAttribute.bind(currentScript);
    var website = attr(_data + "website-id");
    var hostUrl = (_a = attr(_data + "host-url")) === null || _a === void 0 ? void 0 : _a.replace(/\/$/, '');
    var cssEvents = attr(_data + "css-events") !== _false;
    var endpoint = "".concat(hostUrl, "/ingestion");
    var screen = "".concat(width, "x").concat(height);
    var eventClass = /^stellata--([a-z]+)--([\w]+[\w-]*)$/;
    var eventSelect = "[class*='stellata--']";
    var listeners = {};
    var currentUrl = "".concat(pathname).concat(search);
    var currentRef = document.referrer;
    // Determine if the user has tracking disabled
    var trackingEnabled = function () {
        var doNotTrack = window.doNotTrack, navigator = window.navigator, external = window.external;
        var msTrackProtection = "msTrackingProtectionEnabled";
        var msTracking = function () {
            return (external &&
                msTrackProtection in external &&
                external[msTrackProtection]());
        };
        var dntByLocalStorage = localStorage && localStorage.getItem("stellata.disabled") === "true";
        var dnt = doNotTrack ||
            navigator.doNotTrack ||
            navigator.msDoNotTrack ||
            msTracking();
        var dntEnabled = dnt == "1" || dnt == "yes";
        var dntByTag = attr(_data + "do-not-track") === "true";
        var autoTrack = attr(_data + "auto-track") !== "false";
        var domain = attr(_data + "domains");
        var domains = domain !== null ? domain.split(",").map(function (n) { return n.trim(); }) : [];
        var dntByDomains = domains.length > 0 ? !domains.includes(hostname) : false;
        return (autoTrack &&
            !(dntEnabled || dntByTag || dntByLocalStorage || dntByDomains));
    };
    var collect = function (eventType) {
        if (!trackingEnabled())
            return;
        if (website === null)
            return;
        if (eventType === undefined)
            return;
        var payload = {
            eventType: eventType,
            websiteId: website,
            hostname: hostname,
            screen: screen,
            language: language,
            url: currentUrl,
            referrer: currentRef
        };
        fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify({ payload: payload }),
            headers: { 'Content-Type': 'application/json' }
        })
            .then(function (res) { return res.text(); })["catch"](function (error) { return error; });
    };
    var addEvents = function (node) {
        var elements = node.querySelectorAll(eventSelect);
        elements.forEach(function (element) {
            var get = element.getAttribute.bind(element);
            (get("class") || "").split(" ").forEach(function (className) {
                if (!eventClass.test(className))
                    return;
                var _a = className.split("--"), event = _a[1], name = _a[2];
                if (event === undefined || name === undefined)
                    return;
                var listener = listeners[className]
                    ? listeners[className]
                    : (listeners[className] = function (e) {
                        if (event === "click" &&
                            element.tagName === "A" &&
                            !(e.ctrlKey ||
                                e.shiftKey ||
                                e.metaKey ||
                                (e.button && e.button === 1) ||
                                get("target"))) {
                            e.preventDefault();
                            collect(name);
                            var href = get("href");
                            if (href) {
                                location.href = href;
                            }
                        }
                        else {
                            collect(name);
                        }
                    });
                element.addEventListener(event, listener, true);
            });
        });
    };
    var observeDocument = function () {
        var monitorMutate = function (mutations) {
            mutations.forEach(function (mutation) {
                var element = mutation.target;
                addEvents(element);
            });
        };
        var observer = new MutationObserver(monitorMutate);
        observer.observe(document, { childList: true, subtree: true });
    };
    var hook = function (_this, method) {
        var orig = method === 'pushState' ? _this.pushState : _this.replaceState;
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            handlePush.apply(void 0, args);
            return orig.apply(_this, args);
        };
    };
    var handlePush = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!args.url)
            return;
        currentRef = currentUrl;
        var newUrl = args.url.toString();
        if (newUrl.substring(0, 4) === 'http') {
            currentUrl = '/' + newUrl.split('/').splice(3).join('/');
        }
        else {
            currentUrl = newUrl;
        }
        if (currentUrl !== currentRef) {
            collect("pageView");
        }
    };
    if (!window.stellata) {
        var stellata = function (eventValue) { return collect(eventValue); };
        stellata.collect = collect;
        window.stellata = stellata;
    }
    if (trackingEnabled()) {
        history.pushState = hook(history, 'pushState');
        history.replaceState = hook(history, 'replaceState');
        var update = function () {
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
