/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing. The function also has a property 'clear' 
 * that is a function which will clear the timer to prevent previously scheduled executions. 
 *
 * A common issue with other debounce implementations is that if the user closes
 * the browser tab, the debounced function may not have run yet. This is a
 * frequent cause of data loss. This implementation prevents that problem by
 * running the debounced function immediately if the tab is closed prior to the
 * timeout. (This is ignored in Node.js or other headless runtimes.)
 *
 * When making debounced API calls it is recommended to use `fetch()` with the
 * `keepalive` parameter. This allows the HTTP request to finish in the
 * background after the user closes the browser tab.
 *
 * @source underscore.js
 * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
 * @param {Function} function to wrap
 * @param {Number} timeout in ms (`100`)
 * @param {Boolean} whether to execute at the beginning (`false`)
 * @api public
 */
function debounce(func, wait, immediate){
  var timeout, args, context, timestamp, result;
  if (null == wait) wait = 100;

  function later() {
    var last = Date.now() - timestamp;
    var pageHidden = global.document && global.document.visibilityState === 'hidden';

    clearTimeout(timeout);
    if (last < wait && last >= 0 && (!pageHidden || immediate)) {
      timeout = setTimeout(later, wait - last);
    } else {
      if (!immediate && global.document && global.document.removeEventListener) {
        global.document.removeEventListener(
          'visibilityChange',
          later, { capture: true });
      }
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
        // This check is needed because `func` can recursively invoke `debounced`.
        if (!timeout) {
          context = args = null;
        }
      }
    }
  };

  var debounced = function(){
    context = this;
    args = arguments;
    timestamp = Date.now();
    var callNow = immediate && !timeout;
    if (!timeout) {
        timeout = setTimeout(later, wait);
        if (!immediate && global.document && global.document.addEventListener) {
          global.document.addEventListener(
              'visibilityChange', later, { capture: true, passive: true });
        }
    }
    if (callNow) {
      result = func.apply(context, args);
      context = args = null;
    }

    return result;
  };

  debounced.clear = function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  debounced.flush = function() {
    if (timeout) {
      result = func.apply(context, args);
      context = args = null;
      
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
};

// Adds compatibility for ES modules
debounce.debounce = debounce;

module.exports = debounce;
