(function installCopilotSelecterBridge() {
  if (globalThis.__copilotSelecterBridge) {
    return;
  }
  globalThis.__copilotSelecterBridge = true;

  const EVENT_NAME = "copilot-selecter-act";

  function reactProps(element) {
    if (!element) {
      return null;
    }
    const key = Object.keys(element).find(
      (name) => name.startsWith("__reactProps$") || name.startsWith("__reactEventHandlers$"),
    );
    return key ? element[key] : null;
  }

  function fakeEvent(element, type) {
    return {
      type,
      bubbles: true,
      cancelable: true,
      persist() {},
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {},
      nativeEvent: { isTrusted: true, type },
      currentTarget: element,
      target: element,
      view: window,
    };
  }

  function callReact(element, handlerNames) {
    let node = element;
    for (let depth = 0; depth < 10 && node; depth += 1) {
      const props = reactProps(node) || {};
      for (const name of handlerNames) {
        if (typeof props[name] === "function") {
          props[name](fakeEvent(node, name.slice(2).toLowerCase()));
          return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  function nativePointer(element, type) {
    const rect = element.getBoundingClientRect();
    const clientX = rect.left + Math.min(Math.max(rect.width / 2, 4), 24);
    const clientY = rect.top + Math.min(Math.max(rect.height / 2, 4), 24);
    const init = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX,
      clientY,
      button: 0,
      buttons: type === "pointerup" || type === "mouseup" ? 0 : 1,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      view: window,
    };
    if (type.startsWith("pointer")) {
      element.dispatchEvent(new PointerEvent(type, init));
    } else {
      element.dispatchEvent(new MouseEvent(type, init));
    }
  }

  function hover(element) {
    nativePointer(element, "pointerover");
    nativePointer(element, "pointerenter");
    nativePointer(element, "mouseover");
    nativePointer(element, "mouseenter");
    nativePointer(element, "pointermove");
    callReact(element, ["onPointerEnter", "onPointerOver", "onMouseEnter", "onMouseOver"]);
    if (typeof element.focus === "function") {
      element.focus();
    }
  }

  function click(element) {
    hover(element);
    nativePointer(element, "pointerdown");
    nativePointer(element, "mousedown");
    nativePointer(element, "pointerup");
    nativePointer(element, "mouseup");
    nativePointer(element, "click");
    callReact(element, ["onPointerDown", "onMouseDown", "onClick"]);
    if (typeof element.click === "function") {
      element.click();
    }
  }

  function sendKey(element, key) {
    const keyCode = {
      ArrowDown: 40,
      ArrowUp: 38,
      ArrowRight: 39,
      ArrowLeft: 37,
      Enter: 13,
      Home: 36,
      Escape: 27,
    }[key];
    const init = {
      key,
      code: key,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
    };
    const target = element || document.activeElement || document.body;
    target.dispatchEvent(new KeyboardEvent("keydown", init));
    callReact(target, ["onKeyDown"]);
    target.dispatchEvent(new KeyboardEvent("keyup", init));
  }

  document.addEventListener(
    EVENT_NAME,
    (event) => {
      const detail = event.detail || {};
      const action = detail.action;
      if (!action) {
        return;
      }
      const element = detail.token
        ? document.querySelector(`[data-cdm-token="${detail.token}"]`)
        : document.activeElement;
      try {
        if (action === "key") {
          sendKey(element, detail.key);
          return;
        }
        if (!element) {
          return;
        }
        if (action === "hover") {
          hover(element);
        } else if (action === "click") {
          click(element);
        }
      } finally {
        if (detail.token && element) {
          element.removeAttribute("data-cdm-token");
        }
      }
    },
    true,
  );
})();
