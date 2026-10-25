console.log('IT’S ALIVE!');

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? '/'
    : '/portfolio/';

const pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'resume/', title: 'Resume' },
    { url: 'https://github.com/DariyMarsh', title: 'GitHub' },
];

const nav = document.createElement('nav');
nav.setAttribute('aria-label', 'Main navigation');
document.body.prepend(nav);

// Treat a directory URL and its index.html as the same page.
const pagePath = location.pathname.replace(/index\.html$/, '');
for (const page of pages) {
    const a = document.createElement('a');
    a.href = page.url.startsWith('http') ? page.url : BASE_PATH + page.url;
    a.textContent = page.title;
    if (a.host === location.host && a.pathname === pagePath) {
        a.classList.add('current');
        a.setAttribute('aria-current', 'page');
    }
    if (a.host !== location.host) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
    }
    nav.append(a);
}

document.body.insertAdjacentHTML('afterbegin', `
    <label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>
`);

const select = document.querySelector('.color-scheme select');
function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty('color-scheme', colorScheme);
    select.value = colorScheme;
}

try {
    const savedScheme = localStorage.getItem('colorScheme');
    if (['light dark', 'light', 'dark'].includes(savedScheme)) {
        setColorScheme(savedScheme);
    }
} catch {
    // The selector still works when browser storage is unavailable.
}

select.addEventListener('input', (event) => {
    setColorScheme(event.target.value);
    try {
        localStorage.setItem('colorScheme', event.target.value);
    } catch {
        // Keep the selected theme for this page even without storage.
    }
});

const form = document.querySelector('form[action^="mailto:"]');
form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const params = [];
    for (const [name, value] of data) {
        params.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
    }
    location.href = `${form.action}?${params.join('&')}`;
});
