/** Entry-stamp reveal: every [data-stamp] element fades/rises in when it
 *  first scrolls into view, staggered in small waves. Calm mode neutralizes
 *  the effect in CSS (.rvl-calm [data-stamp] is always visible). */
export function armStamps(): void {
  const els = [...document.querySelectorAll<HTMLElement>('[data-stamp]')];
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  );
  els.forEach((el, i) => {
    el.style.setProperty('--d', `${(i % 5) * 70}ms`);
    io.observe(el);
  });
}
