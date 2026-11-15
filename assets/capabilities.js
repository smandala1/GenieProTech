(function () {
  "use strict";
  var explorer = document.querySelector('.capability-explorer');
  if (!explorer) return;
  var panels = Array.from(explorer.querySelectorAll('.capability-panel'));
  var list = explorer.querySelector('.capability-tabs');
  var desktop = window.matchMedia('(min-width: 761px)');
  var selected = Math.max(0, panels.findIndex(function (p) { return '#' + p.id === location.hash; }));
  var buttons = panels.map(function (panel, index) {
    var button = document.createElement('button');
    button.type = 'button';
    button.id = panel.id + '-tab';
    button.innerHTML = panel.querySelector('summary').innerHTML;
    button.addEventListener('click', function () { select(index); });
    button.addEventListener('keydown', function (event) {
      var next = index;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % panels.length;
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + panels.length - 1) % panels.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = panels.length - 1;
      else return;
      event.preventDefault(); select(next); buttons[next].focus();
    });
    list.appendChild(button);
    panel.addEventListener('toggle', function () {
      if (!desktop.matches && panel.open) selected = index;
    });
    return button;
  });
  function select(index) {
    selected = index;
    panels.forEach(function (panel, i) {
      panel.open = i === selected;
      if (desktop.matches) {
        buttons[i].setAttribute('aria-selected', String(i === selected));
        buttons[i].tabIndex = i === selected ? 0 : -1;
      }
    });
  }
  function layout() {
    explorer.classList.toggle('is-tabbed', desktop.matches);
    list.hidden = !desktop.matches;
    if (desktop.matches) { list.setAttribute('role', 'tablist'); list.setAttribute('aria-orientation', 'vertical'); }
    else { list.removeAttribute('role'); list.removeAttribute('aria-orientation'); }
    panels.forEach(function (panel, i) {
      var body = panel.querySelector('.capability-panel-body');
      if (desktop.matches) {
        buttons[i].setAttribute('role', 'tab');
        buttons[i].setAttribute('aria-controls', body.id);
        body.setAttribute('role', 'tabpanel');
        body.setAttribute('aria-labelledby', buttons[i].id);
        body.tabIndex = 0;
      } else {
        buttons[i].removeAttribute('role');
        body.removeAttribute('role'); body.removeAttribute('aria-labelledby'); body.removeAttribute('tabindex');
      }
    });
    select(selected);
  }
  window.addEventListener('hashchange', function () {
    var index = panels.findIndex(function (p) { return '#' + p.id === location.hash; });
    if (index >= 0) select(index);
  });
  desktop.addEventListener('change', layout);
  layout();
})();
