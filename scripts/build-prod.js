const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

function env(key, fallback = '') {
  const v = process.env[key];
  return typeof v === 'string' ? v : fallback;
}

const root = path.resolve(__dirname, '..');
const basePath = (env('VITE_BASE_PATH', '/') || '/').replace(/\/+$/, '/') + (env('VITE_BASE_PATH', '/') && env('VITE_BASE_PATH', '/') !== '/' ? '' : '');
const normalizedBase = basePath === '' ? '/' : basePath;

console.log(`[build:prod] VITE_BASE_PATH=${normalizedBase}`);

// Step 1: clean dist
const distDir = path.join(root, 'dist');
if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true, force: true });

// Step 2: run uni build -p h5 --mode production
const runner = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const uniArgs = ['uni', 'build', '-p', 'h5', '--mode', 'production'];
console.log(`[build:prod] ${runner} ${uniArgs.join(' ')}`);
const buildResult = spawnSync(runner, uniArgs, {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform !== 'win32' ? false : true,
});
if (buildResult.status !== 0) {
  process.exit(buildResult.status || 1);
}

// Step 3: flatten dist/build/h5 -> dist root (align with Dockerfile: COPY dist /usr/share/nginx/html)
const h5Root = path.join(distDir, 'build', 'h5');
if (!fs.existsSync(h5Root)) {
  console.error(`[build:prod] missing uni output: ${h5Root}`);
  process.exit(2);
}
const entries = fs.readdirSync(h5Root);
for (const name of entries) {
  const src = path.join(h5Root, name);
  const dst = path.join(distDir, name);
  if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync(src, dst, { recursive: true });
}
const buildSub = path.join(distDir, 'build');
if (fs.existsSync(buildSub)) fs.rmSync(buildSub, { recursive: true, force: true });

// Step 4: if VITE_BASE_PATH != "/", rewrite pages.json iconPath to include base prefix,
// and ensure static/ is copied to dist root (pages.json uses /static/... absolute paths).
const pagesJsonPath = path.join(distDir, 'pages.json');
if (normalizedBase !== '/' && fs.existsSync(pagesJsonPath)) {
  const pagesJson = JSON.parse(fs.readFileSync(pagesJsonPath, 'utf8'));
  const prefix = normalizedBase.endsWith('/') ? normalizedBase.slice(0, -1) : normalizedBase;
  const rewriteStaticAbs = (p) => {
    if (typeof p !== 'string') return p;
    if (p.startsWith('/static/')) return `${prefix}${p}`;
    return p;
  };
  if (pagesJson.tabBar && Array.isArray(pagesJson.tabBar.list)) {
    pagesJson.tabBar.list.forEach((it) => {
      it.iconPath = rewriteStaticAbs(it.iconPath);
      it.selectedIconPath = rewriteStaticAbs(it.selectedIconPath);
    });
  }
  fs.writeFileSync(pagesJsonPath, JSON.stringify(pagesJson, null, 2) + '\n', 'utf8');
  console.log(`[build:prod] pages.json tabbar iconPath rewritten with base=${prefix}`);
}

// Step 5: ensure tabbar images exist both at dist/static/ AND dist root (for sub-path deployments),
// and the images folder stays intact (it contains the in-page background/nav images).
const staticDist = path.join(distDir, 'static');
if (!fs.existsSync(staticDist)) fs.mkdirSync(staticDist, { recursive: true });
const srcStatic = path.join(root, 'static');
const tabbarSrcs = [
  'tabbar-home.png',
  'tabbar-home-active.png',
  'tabbar-combo.png',
  'tabbar-combo-active.png',
  'tabbar-user.png',
  'tabbar-user-active.png',
];
for (const f of tabbarSrcs) {
  const s = path.join(srcStatic, f);
  const dInStatic = path.join(staticDist, f);
  const dAtRoot = path.join(distDir, f);
  if (fs.existsSync(s)) {
    fs.copyFileSync(s, dInStatic);
    fs.copyFileSync(s, dAtRoot);
    console.log(`[build:prod] copy tabbar ${f} -> static/ + root`);
  }
}

// Step 6: ensure dist/images folder exists too (uni H5 copies static/images sometimes;
// guarantee via explicit copy if it's missing).
const imagesSrc = path.join(srcStatic, 'images');
const imagesDst = path.join(distDir, 'images');
if (fs.existsSync(imagesSrc) && !fs.existsSync(imagesDst)) {
  fs.cpSync(imagesSrc, imagesDst, { recursive: true });
  console.log('[build:prod] copy static/images -> dist/images');
}
const imagesInStaticDst = path.join(staticDist, 'images');
if (fs.existsSync(imagesSrc) && !fs.existsSync(imagesInStaticDst)) {
  fs.cpSync(imagesSrc, imagesInStaticDst, { recursive: true });
  console.log('[build:prod] copy static/images -> dist/static/images');
}

// Step 7: ensure nginx fallback for sub-path: if base != "/" then we need a nested index fallback
// The existing nginx.conf uses try_files /index.html. For sub-paths, docker deployment must alias correctly.
console.log('[build:prod] complete');
