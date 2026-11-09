(function () {
  var KEY = 'karaoke:intro-seen';
  var root = document.documentElement;
  var curtain = document.getElementById('intro-curtain');

  if (!curtain) return;

  var finish = function () {
    root.classList.add('intro-skip');

    try {
      window.sessionStorage.setItem(KEY, '1');
    } catch (error) {
      // Private mode may block the session store.
    }
  };

  if (root.classList.contains('intro-skip')) {
    finish();
    try {
      curtain.remove();
    } catch (error) {
      curtain.style.display = 'none';
    }
    return;
  }

  var reduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    finish();
    return;
  }

  var done = false;

  var complete = function () {
    if (done) return;
    done = true;
    finish();
  };

  curtain.addEventListener('animationend', function (event) {
    if (event.animationName === 'intro-curtain') {
      complete();
    }
  }, { once: true });

  window.setTimeout(complete, 1750);
})();
