const installer = document.getElementById('bgftPwaInstall');
const choice = document.getElementById('bgftInstallChoice');
const installPrompt = document.getElementById('bgftInstallPrompt');
const installDescription = document.getElementById('bgftInstallPromptDescription');
const installNow = document.getElementById('bgftStartInstall');
const continueInBrowser = document.getElementById('bgftUseBrowser');
const installIntent = new URLSearchParams(location.search).get('install') === '1';

if (installer && choice && installPrompt) {
  const showChoice = ({ installed, failed = false } = {}) => {
    if (installed) {
      document.getElementById('bgftInstallChoiceHeading').textContent = 'BGFT is installed';
      choice.querySelector('p').textContent = 'Choose how you want to continue.';
      choice.querySelector('#bgftOpenInstalledApp').hidden = false;
      choice.querySelector('#bgftOpenInBrowser').hidden = false;
    } else {
      document.getElementById('bgftInstallChoiceHeading').textContent = failed
        ? 'BGFT could not be installed'
        : 'Installation was not completed';
      choice.querySelector('p').textContent = 'You can still open BGFT in your browser.';
      choice.querySelector('#bgftOpenInstalledApp').hidden = true;
      choice.querySelector('#bgftOpenInBrowser').hidden = false;
    }
    if (!choice.open) choice.showModal();
  };

  installer.addEventListener('pwa-install-success-event', () => {
    installPrompt.close();
    showChoice({ installed: true });
  });

  installer.addEventListener('pwa-install-fail-event', () => {
    installPrompt.close();
    showChoice({ failed: true });
  });

  installer.addEventListener('pwa-user-choice-result-event', event => {
    if (event.detail?.userChoiceResult === 'dismissed') showChoice({ failed: true });
  });

  continueInBrowser?.addEventListener('click', () => {
    installPrompt.close();
    history.replaceState(null, '', location.pathname);
  });

  installNow?.addEventListener('click', () => {
    installPrompt.close();
    try {
      if (installer.isInstallAvailable === true || installer.isWebInstallSupported === true) {
        // Keep the call inside the click handler so native prompts retain user activation.
        const result = installer.install();
        if (result && typeof result.catch === 'function') result.catch(() => showChoice({ failed: true }));
      } else {
        // Safari, Firefox, Opera GX and other browsers use the component's platform-specific guide.
        installer.showDialog(true);
      }
    } catch {
      showChoice({ failed: true });
    }
  });

  choice.querySelectorAll('[data-bgft-choice-close]').forEach(button => {
    button.addEventListener('click', () => choice.close());
  });

  choice.addEventListener('click', event => {
    if (event.target === choice) choice.close();
  });

  if (installIntent) {
    history.replaceState(null, '', `${location.pathname}${location.hash}`);
    customElements.whenDefined('pwa-install').then(async () => {
      // Lit renders the component dialog asynchronously after custom-element upgrade.
      if (installer.updateComplete) await installer.updateComplete;
      if (installer.isUnderStandaloneMode) return;
      installDescription.textContent = installer.isAppleMobilePlatform
        ? 'On iPhone or iPad, BGFT will show the Apple-supported Home Screen installation steps.'
        : installer.isAppleDesktopPlatform
          ? 'BGFT will show the installation option supported by your Mac browser.'
          : 'BGFT will open the installation method supported by this browser and device.';
      requestAnimationFrame(() => {
        if (!installPrompt.open) installPrompt.showModal();
      });
    }).catch(() => {
      const status = document.getElementById('pwaStatus');
      status.textContent = 'BGFT is ready in this browser. Your browser may still offer its own supported app-install option.';
      status.hidden = false;
    });
  }
}
