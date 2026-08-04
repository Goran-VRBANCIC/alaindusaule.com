(() => {
  const reverse = (value) => [...value].reverse().join("");
  const separator = String.fromCharCode(64);
  const destination = [reverse("eluasudniala"), reverse("moc.liamg")].join(separator);

  document.querySelectorAll("[data-contact-button]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const subject = button.dataset.contactSubject;
      const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
      window.location.href = `mailto:${destination}${query}`;
    });
  });
})();
