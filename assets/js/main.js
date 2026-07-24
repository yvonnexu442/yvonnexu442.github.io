"use strict";

function initializeNavigation() {
  const button = document.querySelector(".nav-toggle");
  const navigation = document.querySelector(".primary-navigation");
  if (!button || !navigation) return;

  const closeNavigation = (returnFocus = false) => {
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Open navigation");
    navigation.classList.remove("is-open");
    if (returnFocus) button.focus();
  };

  button.addEventListener("click", () => {
    const isOpen = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!isOpen));
    button.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
    navigation.classList.toggle("is-open", !isOpen);
  });

  navigation.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLAnchorElement)) return;
    closeNavigation();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || button.getAttribute("aria-expanded") !== "true") return;
    closeNavigation(true);
  });

  window.matchMedia("(min-width: 56.0625rem)").addEventListener("change", (event) => {
    if (event.matches) closeNavigation();
  });
}

function initializeTheme() {
  const button = document.querySelector(".theme-toggle");
  if (!button) return;

  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  const currentTheme = () => {
    const explicitTheme = document.documentElement.dataset.theme;
    if (explicitTheme) return explicitTheme;
    return systemPrefersDark.matches ? "dark" : "light";
  };

  const updateButton = () => {
    const isDark = currentTheme() === "dark";
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
  };

  button.addEventListener("click", () => {
    const nextTheme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    try {
      window.localStorage.setItem("site-theme", nextTheme);
    } catch {
      // Theme persistence is optional when storage is unavailable.
    }
    updateButton();
  });

  systemPrefersDark.addEventListener("change", updateButton);
  updateButton();
}

function initializePublications() {
  const list = document.querySelector("#publication-list");
  if (!list) return;

  const addText = (parent, tagName, className, text) => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
  };

  fetch("data/publications.json")
    .then((response) => {
      if (!response.ok) throw new Error("Publication data unavailable");
      return response.json();
    })
    .then((data) => {
      const records = Array.isArray(data.items)
        ? data.items
            .filter((item) => item.visibilityStatus === "public" && item.status === "published")
            .sort((a, b) => Number(b.year) - Number(a.year))
        : [];

      records.forEach((record, index) => {
        if (record.id && document.getElementById(record.id)) return;
        const article = document.createElement("article");
        article.className = "publication-card";
        if (record.id) article.id = record.id;

        const indexText = String(index + 1).padStart(2, "0");
        addText(article, "p", "publication-card-index", indexText);

        const body = document.createElement("div");
        body.className = "publication-card-body";
        addText(body, "p", "publication-type", `${record.type || "Scholarly output"} · ${record.year || ""}`);
        addText(body, "h3", "", record.displayTitle || record.title);
        if (record.shortSummary) addText(body, "p", "publication-summary", record.shortSummary);
        if (record.abstract) {
          const abstract = document.createElement("section");
          abstract.className = "publication-abstract";
          addText(abstract, "h4", "", "Abstract");
          addText(abstract, "p", "", record.abstract);
          body.append(abstract);
        }

        const metadata = document.createElement("dl");
        metadata.className = "publication-card-metadata";
        [
          ["Authors", Array.isArray(record.authors) ? record.authors.join(", ") : ""],
          ["Venue", record.venue || ""],
          ["Research stream", record.researchStream || ""]
        ].forEach(([label, value]) => {
          if (!value) return;
          const group = document.createElement("div");
          addText(group, "dt", "", label);
          addText(group, "dd", "", value);
          metadata.append(group);
        });
        body.append(metadata);

        const links = document.createElement("div");
        links.className = "publication-card-links";
        [
          ["View record", record.publicRecordUrl || record.publicUrl],
          ["Google Scholar", record.googleScholarUrl],
          ["PDF", record.pdfUrl],
          ["DOI", record.doi ? `https://doi.org/${record.doi}` : null]
        ].forEach(([label, url], linkIndex) => {
          if (!url) return;
          const link = document.createElement("a");
          link.href = url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = `${label} ↗`;
          if (linkIndex > 0) link.className = "publication-link-secondary";
          links.append(link);
        });
        body.append(links);
        article.append(body);
        list.append(article);
      });
    })
    .catch(() => {
      console.warn("Verified publication data could not be refreshed; retaining the published HTML record.");
    });
}

function initializePrintCv() {
  const printButton = document.querySelector("[data-print-cv]");
  if (printButton) printButton.addEventListener("click", () => window.print());
}

function initializePracticeField() {
  const field = document.querySelector(".practice-field");
  if (!field) return;

  const domains = [...field.querySelectorAll("[data-practice-domain]")];
  const updateRelatedTerms = (domain) => {
    field.querySelectorAll(".practice-term.is-related").forEach((term) => {
      term.classList.remove("is-related");
    });
    if (!domain) return;

    const bridges = new Set(
      [...domain.querySelectorAll("[data-bridge]")].map((term) => term.dataset.bridge)
    );
    field.querySelectorAll("[data-bridge]").forEach((term) => {
      if (bridges.has(term.dataset.bridge)) term.classList.add("is-related");
    });
  };

  domains.forEach((domain) => {
    domain.addEventListener("pointerenter", () => updateRelatedTerms(domain));
    domain.addEventListener("pointerleave", () => updateRelatedTerms(null));
  });

  if (!("IntersectionObserver" in window)) {
    field.classList.add("is-visible");
    return;
  }

  field.classList.add("is-observed");

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      field.classList.add("is-visible");
      observer.disconnect();
    },
    { threshold: 0.18 }
  );

  observer.observe(field);
}

function initializeInformationFigures() {
  const figures = [...document.querySelectorAll("[data-information-figure]")];
  if (!figures.length) return;

  if (!("IntersectionObserver" in window)) {
    figures.forEach((figure) => figure.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    },
    { threshold: 0.12 }
  );

  figures.forEach((figure) => {
    figure.classList.add("is-observed");
    observer.observe(figure);
  });
}

function initializeEditorialReveals() {
  const elements = [
    ...document.querySelectorAll(
      ".home-page .hero-copy > *, .home-page .decision-figure, .home-page .quote-grid > *, " +
      ".home-page .section-header > *, .home-page .feature-card, .home-page .program-bridge-grid > *, " +
      ".research-page [data-reveal], .practice-page [data-reveal], .publications-page [data-reveal], " +
      ".about-page [data-reveal], .service-page [data-reveal]"
    )
  ];
  if (!elements.length) return;

  elements.forEach((element, index) => {
    element.classList.add("editorial-reveal");
    element.style.setProperty("--reveal-order", String(index % 5));
  });

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -8%" }
  );

  elements.forEach((element) => observer.observe(element));
}

function initializeDecisionFigure() {
  const figure = document.querySelector(".home-page .decision-figure");
  if (!figure) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    figure.classList.add("is-activated");
    return;
  }

  figure.classList.add("is-observed");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        figure.classList.toggle("is-activated", entry.isIntersecting);
      });
    },
    { threshold: 0.28, rootMargin: "0px 0px -8%" }
  );

  observer.observe(figure);
}

function initializeFormationTimeline() {
  const timeline = document.querySelector(".formation-timeline");
  if (!timeline) return;

  const stages = [...timeline.querySelectorAll("[data-formation-stage]")];
  if (!("IntersectionObserver" in window)) {
    timeline.classList.add("is-visible");
    return;
  }

  timeline.classList.add("is-observed");

  const timelineObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      timeline.classList.add("is-visible");
      timelineObserver.disconnect();
    },
    { threshold: 0.05 }
  );

  const stageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-active", entry.isIntersecting);
      });
    },
    { rootMargin: "-30% 0px -45%", threshold: 0.05 }
  );

  timelineObserver.observe(timeline);
  stages.forEach((stage) => stageObserver.observe(stage));
}

function initializeAnchorNavigation() {
  if (!document.documentElement.classList.contains("foundations-document")) return;

  const moveToTarget = () => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    const target = document.getElementById(id);
    if (!target) return;

    document.documentElement.classList.add("is-anchor-navigation");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start" });
        window.setTimeout(() => {
          document.documentElement.classList.remove("is-anchor-navigation");
        }, 700);
      });
    });
  };

  window.addEventListener("hashchange", moveToTarget);
  moveToTarget();
}

initializeNavigation();
initializeTheme();
initializePublications();
initializePrintCv();
initializePracticeField();
initializeInformationFigures();
initializeFormationTimeline();
initializeAnchorNavigation();
initializeEditorialReveals();
initializeDecisionFigure();
