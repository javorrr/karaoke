/* Pause decorative loops whenever the tab is hidden. CSS reads the attribute;
   this keeps long karaoke sessions from animating an invisible page. */

const root = document.documentElement;

const sync = () => {
  root.dataset.pageHidden = document.hidden ? 'true' : 'false';
};

document.addEventListener('visibilitychange', sync);
sync();
