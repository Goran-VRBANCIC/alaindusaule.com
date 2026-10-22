const player = document.querySelector('[data-documentary-video]');

if (player) {
  const button = player.querySelector('.documentary__play');
  const videoId = player.dataset.videoId;

  button?.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
    iframe.title = 'Documentaire sur le Grid Hydrique National';
    iframe.loading = 'lazy';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    player.replaceChildren(iframe);
  }, { once: true });
}
