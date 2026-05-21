// sw.js - YAN PWA Service Worker
// 版本: v20260521
// 适配路径: https://phinexmila-dev.github.io/last/

const CACHE_NAME = 'yan-v20260521';

// 需要缓存的静态资源（核心文件）
const STATIC_CACHE_URLS = [
  '/last/',
  '/last/index.html',
  '/last/manifest.json',
  '/last/css/all.min.css',
  '/last/css/cropper.min.css',
  '/last/css/styles-part1.css',
  '/last/css/styles-part2.css',
  '/last/css/styles-part3.css',
  '/last/css/styles-penguin-video.css',
  '/last/css/styles-study.css',
  '/last/css/styles-vocab-game.css',
  '/last/css/default-theme.css',
  '/last/css/spirit_styles_new.css',
  '/last/css/styles-spirit-v2.css',
  '/last/css/web-perf.css',
  '/last/css/ios-perf.css',
  '/last/js/cropper.min.js',
  '/last/js/dev-console.js',
  '/last/js/auth-ui.js',
  '/last/js/app-disclaimer.js',
  '/last/js/device-adapter.js',
  '/last/images/icon-96x96.png',
  '/last/images/icon-192x192.png',
  '/last/images/icon-512x512.png'
];

// 安装事件：缓存核心文件
self.addEventListener('install', event => {
  console.log('[SW] 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] 缓存核心文件');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] 安装完成');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] 缓存失败:', err);
      })
  );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', event => {
  console.log('[SW] 激活中...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] 删除旧缓存:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('[SW] 激活完成，接管页面');
      return self.clients.claim();
    })
  );
});

// 请求拦截：优先网络，失败则使用缓存
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // 只处理同源请求（不处理跨域API）
  const isSameOrigin = url.origin === self.location.origin;
  
  // HTML 请求：网络优先，失败时返回离线页面
  if (isSameOrigin && request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // 克隆响应并缓存
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          console.log('[SW] 网络失败，返回缓存页面');
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) return cachedResponse;
              return caches.match('/last/index.html');
            });
        })
    );
    return;
  }
  
  // 静态资源：缓存优先，网络后备
  if (isSameOrigin && STATIC_CACHE_URLS.some(url => request.url.includes(url))) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then(response => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
            return response;
          });
        })
        .catch(() => {
          console.log('[SW] 资源获取失败:', request.url);
        })
    );
    return;
  }
  
  // 其他请求：网络优先，可选缓存（不阻塞）
  if (isSameOrigin) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // 只缓存成功的 GET 请求
          if (request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
  // 跨域请求直接放行（不拦截）
});

// 监听消息（用于强制刷新）
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'FORCE_CACHE_CLEAR') {
    console.log('[SW] 收到强制清缓存指令');
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] 缓存已清除');
    });
  }
});

// 后台同步（可选，用于离线消息）
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    console.log('[SW] 后台同步触发');
    event.waitUntil(syncMessages());
  }
});

function syncMessages() {
  // 可以在这里实现离线消息同步逻辑
  return Promise.resolve();
}
