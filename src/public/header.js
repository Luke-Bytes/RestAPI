(function(){
  async function injectHeader(){
    try{
      const res = await fetch('/header.html', { cache: 'no-store' });
      if(!res.ok) return;
      const html = await res.text();
      const tmp = document.createElement('div');
      tmp.innerHTML = html.trim();
      const header = tmp.firstElementChild;
      if(!header) return;
      const target = document.getElementById('site-header');
      if (target) {
        target.replaceWith(header);
      } else {
        document.body.insertBefore(header, document.body.firstChild);
      }
      // Set active link
      const path = location.pathname.replace(/\/+$/,'') || '/';
      header.querySelectorAll('a.nav-link').forEach(a => {
        const href = (a.getAttribute('href') || '').replace(/\/+$/,'') || '/';
        if (href === path) a.classList.add('active');
      });
    } catch(e){
      // silent
    }
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', injectHeader);
  } else {
    injectHeader();
  }
})();

