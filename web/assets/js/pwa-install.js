const installer = document.getElementById('bgftPwaInstall');
const choice = document.getElementById('bgftInstallChoice');
const installIntent = new URLSearchParams(location.search).get('install') === '1';

if (installer && choice) {
  installer.addEventListener('pwa-install-success-event', () => {
    if (!choice.open) choice.showModal();
  });

  installer.addEventListener('pwa-install-fail-event', () => {
    document.getElementById('bgftInstallChoiceHeading').textContent = 'BGFT could not be installed';
    choice.querySelector('p').textContent = 'You can still use BGFT in your browser.';
    if (!choice.open) choice.showModal();
  });

  if (installIntent) {
    history.replaceState(null, '', `${location.pathname}${location.hash}`);
    if (customElements.get('pwa-install')) {
      customElements.whenDefined('pwa-install').then(async () => {
      // Wait for Lit to render the component's internal dialog before opening it.
      if (installer.updateComplete) await installer.updateComplete;
      requestAnimationFrame(() => installer.showDialog(true));
    }).catch(() => {
      const status = document.getElementById('pwaStatus');
      status.textContent = 'BGFT is ready to use in this browser. Your browser can still install it from its app menu.';
      status.hidden = false;
    });
    } else {
      const status = document.getElementById('pwaStatus');
      status.textContent = 'The install guide could not be loaded. BGFT is still available in this browser; use your browser’s supported app-install option to add it to your device.';
      status.hidden = false;
    }
  }
}
