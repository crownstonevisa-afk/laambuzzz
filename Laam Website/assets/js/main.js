/**
 * LAAM LEGAL - NEO-BRUTALISM CORE JAVASCRIPT
 * Includes:
 * 1. Bouncing Dots Preloader Dismissal
 * 2. Magnetic Follow Cursor with Micro-Interactions
 * 3. Vertical & Horizontal Scrub Scroll Motion Reveal
 * 4. Accordion FAQs Interaction
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. DISMISS BOUNCING DOTS PRELOADER
  const preloader = document.getElementById('loader-overlay');
  if (preloader) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        preloader.classList.add('fade-out');
      }, 400);
    });
    // Fallback if load already fired
    setTimeout(() => {
      if (!preloader.classList.contains('fade-out')) {
        preloader.classList.add('fade-out');
      }
    }, 1200);
  }

  // 2. MAGNETIC HOVER FOLLOW CURSOR (DESKTOP)
  if (window.innerWidth >= 1024) {
    let dot = document.createElement('div');
    dot.className = 'cursor-dot';
    let follower = document.createElement('div');
    follower.className = 'cursor-follower';
    document.body.appendChild(dot);
    document.body.appendChild(follower);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let followerX = mouseX;
    let followerY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    });

    // Smooth follower lerp
    function animateCursor() {
      followerX += (mouseX - followerX) * 0.18;
      followerY += (mouseY - followerY) * 0.18;
      follower.style.transform = `translate(${followerX}px, ${followerY}px)`;
      requestAnimationFrame(animateCursor);
    }
    requestAnimationFrame(animateCursor);

    // Magnetic micro-interactions on interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .btn-brutal, .faq-question, .category-card, .article-card');
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        follower.classList.add('cursor-hover');
      });
      el.addEventListener('mouseleave', () => {
        follower.classList.remove('cursor-hover');
        el.style.transform = '';
      });
      // Magnetic pull effect on buttons
      if (el.classList.contains('btn-brutal')) {
        el.addEventListener('mousemove', (e) => {
          const rect = el.getBoundingClientRect();
          const relX = e.clientX - rect.left - rect.width / 2;
          const relY = e.clientY - rect.top - rect.height / 2;
          el.style.transform = `translate(${relX * 0.15}px, ${relY * 0.15}px)`;
        });
      }
    });
  }

  // 3. VERTICAL SCRUB SCROLL REVEAL OBSERVER
  const scrollElements = document.querySelectorAll('.reveal-on-scroll, .reveal-left, .reveal-right');
  if ('IntersectionObserver' in window && scrollElements.length > 0) {
    const scrollObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      // A ratio threshold can never be reached by elements that are several
      // viewports tall (such as a complete article wrapper), which left those
      // articles fully transparent -- a blank page. Any intersection now
      // triggers the reveal, so every article becomes readable.
      threshold: 0,
      rootMargin: '0px 0px -40px 0px'
    });

    scrollElements.forEach(el => scrollObserver.observe(el));

    // Safety net: whatever is already on screen when the page has finished
    // loading is revealed immediately, so a page can never open blank.
    window.addEventListener('load', () => {
      scrollElements.forEach(el => {
        const box = el.getBoundingClientRect();
        if (box.top < window.innerHeight && box.bottom > 0) {
          el.classList.add('is-visible');
        }
      });
    });
  } else {
    // Fallback
    scrollElements.forEach(el => el.classList.add('is-visible'));
  }

  // 4. ACCORDION FAQ LOGIC
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.faq-item');
      const isActive = parent.classList.contains('active');

      document.querySelectorAll('.faq-item').forEach(item => {
        const itemButton = item.querySelector('.faq-question');
        const itemAnswer = item.querySelector('.faq-answer');
        item.classList.remove('active');
        if (itemButton) itemButton.setAttribute('aria-expanded', 'false');
        if (itemAnswer) itemAnswer.hidden = true;
      });

      if (!isActive) {
        parent.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
        const answer = parent.querySelector('.faq-answer');
        if (answer) answer.hidden = false;
      }
    });
  });
});
