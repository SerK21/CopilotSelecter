(function initCopilotSelecterDom(global) {
  function isRendered(element) {
    if (!(element instanceof Element)) {
      return false;
    }
    if (element.disabled || element.getAttribute("aria-disabled") === "true") {
      return false;
    }
    const style = global.getComputedStyle?.(element);
    if (style && (style.display === "none" || style.visibility === "hidden")) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  }

  function collectShadowRoots(root) {
    const roots = [];
    const visit = (node) => {
      if (!node?.querySelectorAll) {
        return;
      }
      for (const element of node.querySelectorAll("*")) {
        if (element.shadowRoot) {
          roots.push(element.shadowRoot);
          visit(element.shadowRoot);
        }
      }
    };
    visit(root);
    return roots;
  }

  function queryAllDeep(selector, root = document) {
    const matches = [...root.querySelectorAll(selector)];
    for (const shadowRoot of collectShadowRoots(root)) {
      matches.push(...shadowRoot.querySelectorAll(selector));
    }
    return matches;
  }

  function queryDeep(selector, root = document) {
    return queryAllDeep(selector, root)[0] ?? null;
  }

  global.CopilotSelecterDom = {
    isRendered,
    queryAllDeep,
    queryDeep,
  };
})(globalThis);
