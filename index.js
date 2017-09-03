/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing. The function also has a property 'clear' 
 * that is a function which will clear the timer to prevent previously scheduled executions. 
 *
 * @source underscore.js
 * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
 * @param {Function} function to wrap
 * @param {Number} timeout in ms (`100`)
 * @param {Boolean} whether to execute at the beginning (`false`)
 * @api public
 */
function debounce(func, wait, immediate){
  function newDeferred () {
    var deferred = {};
    deferred.promise = new Promise(function (resolve, reject) {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });

    return deferred;
  }

  var timeout, args, context, timestamp, result, laterDeferred;
  if (null == wait) wait = 100;

  var debounced = function(){
    context = this;
    args = arguments;

    var later = function() {
      var last = Date.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        laterDeferred = null;
        if (!immediate) {
          try {
            result = func.apply(context, args);
            later.deferred.resolve(result);
          } catch (e) {
            later.deferred.reject(e);
          }

          context = args = null;
        }
      }
    };
    later.deferred = laterDeferred = laterDeferred || newDeferred();

    timestamp = Date.now();
    var callNow = immediate && !timeout;
    if (!timeout) timeout = setTimeout(later, wait);
    if (callNow) {
      laterDeferred = null;
      var deferred = newDeferred();
      try {
        result = func.apply(context, args);
        deferred.resolve(result);
      } catch (e) {
        deferred.reject(e);
      }
      
      context = args = null;
    }

    return laterDeferred.promise;
  };

  debounced.clear = function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      laterDeferred = null;
    }
  };
  
  debounced.flush = function() {
    if (timeout) {
      try {
        result = func.apply(context, args);
        laterDeferred.resolve(result);
      } catch (e) {
        laterDeferred.reject(e);
      }
      context = args = null;
      
      clearTimeout(timeout);
      timeout = null;
      laterDeferred = null;
    }
  };

  return debounced;
};

// Adds compatibility for ES modules
debounce.debounce = debounce;

module.exports = debounce;
