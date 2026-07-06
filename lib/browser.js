import puppeteer from 'puppeteer';

let _browser = null;
let _refCount = 0;

export async function getBrowser() {
  if (!_browser || !_browser.connected) {
    _browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--single-process',
      ],
    });
    _refCount = 0;
  }
  _refCount++;
  return _browser;
}

export async function releaseBrowser() {
  _refCount--;
  if (_refCount <= 0 && _browser) {
    try {
      await _browser.close();
    } catch { /* ignore */ }
    _browser = null;
    _refCount = 0;
  }
}
