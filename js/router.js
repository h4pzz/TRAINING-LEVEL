/**
 * AeroCheck — HTML5 History API SPA Client-side Router
 * Handles clean URLs, browser history (popstate), role-based route guards, and active navigation state.
 */

export const ROUTES = {
  '/': {
    view: 'dashboard',
    titleUA: 'AeroCheck — Аналітика',
    titleEN: 'AeroCheck — Dashboard',
    allowedRoles: ['ADMIN', 'INSTRUCTOR', 'OFFICE']
  },
  '/dashboard': {
    view: 'dashboard',
    titleUA: 'AeroCheck — Аналітика',
    titleEN: 'AeroCheck — Dashboard',
    allowedRoles: ['ADMIN', 'INSTRUCTOR', 'OFFICE']
  },
  '/flight-crew': {
    view: 'flight-crew',
    titleUA: 'AeroCheck — Льотний склад',
    titleEN: 'AeroCheck — Flight Crew',
    allowedRoles: ['ADMIN', 'INSTRUCTOR', 'OFFICE']
  },
  '/cabin-crew': {
    view: 'cabin-crew',
    titleUA: 'AeroCheck — Кабінний склад',
    titleEN: 'AeroCheck — Cabin Crew',
    allowedRoles: ['ADMIN', 'INSTRUCTOR', 'OFFICE']
  },
  '/training-flights': {
    view: 'training-flights',
    titleUA: 'AeroCheck — Тренувальні польоти',
    titleEN: 'AeroCheck — Training Flights',
    allowedRoles: ['ADMIN', 'INSTRUCTOR', 'OFFICE']
  },
  '/blanks': {
    view: 'blanks',
    titleUA: 'AeroCheck — Бланки для друку',
    titleEN: 'AeroCheck — Printable Blanks',
    allowedRoles: ['ADMIN', 'INSTRUCTOR', 'OFFICE']
  },
  '/forms': {
    view: 'forms',
    titleUA: 'AeroCheck — Інтерактивні форми',
    titleEN: 'AeroCheck — Smart Forms',
    allowedRoles: ['ADMIN', 'INSTRUCTOR', 'OFFICE']
  },
  '/settings': {
    view: 'settings',
    titleUA: 'AeroCheck — Налаштування',
    titleEN: 'AeroCheck — Settings',
    allowedRoles: ['ADMIN']
  },
  '/portal': {
    view: 'personal-portal',
    titleUA: 'AeroCheck — Особистий кабінет',
    titleEN: 'AeroCheck — Personal Portal',
    allowedRoles: ['ADMIN', 'INSTRUCTOR', 'OFFICE', 'CREW']
  }
};

/**
 * Normalizes URL path by removing trailing slashes (except root) and query strings
 */
export function normalizePath(path) {
  if (!path) return '/';
  const clean = path.split('?')[0].split('#')[0];
  if (clean.length > 1 && clean.endsWith('/')) {
    return clean.slice(0, -1);
  }
  return clean || '/';
}

/**
 * Checks if a specific role is allowed to access the target path
 */
export function canAccessRoute(role, path) {
  const normPath = normalizePath(path);
  const route = ROUTES[normPath] || (normPath.startsWith('/portal') ? ROUTES['/portal'] : null);
  
  if (!route) return false;
  
  const userRole = role || 'CREW';
  
  // Crew members are strictly restricted to their personal portal
  if (userRole === 'CREW') {
    return normPath === '/portal' || normPath.startsWith('/portal');
  }
  
  // Office & Instructors cannot access system settings
  if ((userRole === 'OFFICE' || userRole === 'INSTRUCTOR') && normPath === '/settings') {
    return false;
  }
  
  return route.allowedRoles.includes(userRole);
}

/**
 * Resolves safe allowed path for the current user
 */
export function resolveSafePath(path, role) {
  const norm = normalizePath(path);
  const userRole = role || 'CREW';
  
  if (canAccessRoute(userRole, norm)) {
    return norm;
  }
  
  // If denied, redirect to role's primary landing view
  return userRole === 'CREW' ? '/portal' : '/dashboard';
}

/**
 * Get route definition by view name
 */
export function getRouteByView(viewName) {
  for (const [path, conf] of Object.entries(ROUTES)) {
    if (conf.view === viewName && path !== '/') {
      return { path, ...conf };
    }
  }
  return { path: '/dashboard', ...ROUTES['/dashboard'] };
}

/**
 * Navigates to a new URL path, updates History API, checks guards, and switches view
 */
export function navigateTo(targetPath, replace = false, skipHistory = false) {
  const role = (window.STATE && window.STATE.currentUser) ? window.STATE.currentUser.role : 'ADMIN';
  const safePath = resolveSafePath(targetPath, role);
  const route = ROUTES[safePath] || ROUTES['/dashboard'];
  
  // 1. Update browser history
  if (!skipHistory && window.location.pathname !== safePath) {
    if (replace) {
      window.history.replaceState({ path: safePath, view: route.view }, '', safePath);
    } else {
      window.history.pushState({ path: safePath, view: route.view }, '', safePath);
    }
  }
  
  // 2. Update page document title
  const lang = (window.STATE && window.STATE.lang) || 'uk';
  document.title = lang === 'uk' ? route.titleUA : route.titleEN;
  
  // 3. Update sidebar navigation buttons active state
  document.querySelectorAll('.nav-links .nav-item').forEach(btn => {
    const btnRoute = btn.getAttribute('data-route');
    const btnView = btn.getAttribute('data-view');
    const isActive = btnRoute === safePath || btnView === route.view;
    btn.classList.toggle('active', isActive);
  });
  
  // 4. Activate corresponding view panel via app's switchView without looping
  if (typeof window.executeViewSwitch === 'function') {
    window.executeViewSwitch(route.view);
  }
}

/**
 * Initializes the router listeners and performs the first routing resolution
 */
export function initRouter() {
  // Listen for browser Back / Forward buttons
  window.addEventListener('popstate', (e) => {
    const currentPath = window.location.pathname;
    navigateTo(currentPath, false, true);
  });
  
  // Intercept click on navigation items and any internal links with data-route
  document.addEventListener('click', (e) => {
    const routeTarget = e.target.closest('[data-route]');
    if (routeTarget) {
      const href = routeTarget.getAttribute('data-route');
      if (href && !href.startsWith('http') && !routeTarget.hasAttribute('target')) {
        e.preventDefault();
        navigateTo(href);
      }
    }
  });
}

// Make accessible to global scope for backward-compatibility with inline HTML event handlers
if (typeof window !== 'undefined') {
  window.AeroRouter = {
    ROUTES,
    normalizePath,
    canAccessRoute,
    resolveSafePath,
    getRouteByView,
    navigateTo,
    initRouter
  };
  window.navigateTo = navigateTo;
}
