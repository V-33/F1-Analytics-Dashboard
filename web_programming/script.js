const byId = (id) => document.getElementById(id);

const state = {
  data: null,
  type: "driver",
  metricId: null,
};

const initials = (name) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();


function buildSummaryRows(rows) {
  const parent = byId("headlineRows");
  const template = byId("summaryRowTemplate");
  parent.innerHTML = "";

  rows.forEach((row) => {
    const node = template.content.cloneNode(true);
    node.querySelector(".pill").textContent = row.metric;
    node.querySelector(".left-value").textContent = row.left.value;
    node.querySelector(".left-label").textContent = row.left.label;
    node.querySelector(".right-value").textContent = row.right.value;
    node.querySelector(".right-label").textContent = row.right.label;
    node.querySelector(".hex.left").style.background = row.left.color;
    node.querySelector(".hex.right").style.background = row.right.color;
    parent.append(node);
  });
}


function goToOverview() {
  history.replaceState({}, "", location.pathname);
  renderView();
}

function openDetails(type, metricId) {
  state.type = type;
  state.metricId = metricId;
  const params = new URLSearchParams({ view: "details", type, metric: metricId });
  history.replaceState({}, "", `?${params}`);
  renderView();
}

function buildCards(cards, targetId, type) {
  const parent = byId(targetId);
  const template = byId("statCardTemplate");
  parent.innerHTML = "";

  cards.forEach((card) => {
    const node = template.content.cloneNode(true);
    node.querySelector("header").textContent = card.title;
    const list = node.querySelector("ol");

    card.rows.forEach((item, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${index + 1}</span>
        <span class="avatar" style="background:${item.color}">${initials(item.name)}</span>
        <span class="person">${item.name}</span>
        <span class="value">${item.value}</span>
      `;
      list.append(li);
    });

    node.querySelector(".full-ranking").addEventListener("click", () => {
      openDetails(type, card.metricId);
    });

    parent.append(node);
  });
}

function renderDetail() {
  const detailSet = state.data.details[state.type];
  const metric =
    detailSet.metrics.find((item) => item.id === state.metricId) || detailSet.metrics[0];
  state.metricId = metric.id;

  byId("detailSeason").textContent = state.data.season;
  byId("nameHead").textContent = state.type === "driver" ? "Driver" : "Constructor";
  byId("valueHead").textContent = metric.valueLabel;

  ["driverTab", "constructorTab"].forEach((id) => {
    const btn = byId(id);
    btn.classList.toggle("active", btn.dataset.type === state.type);
  });

  const menu = byId("metricMenu");
  menu.innerHTML = "";
  detailSet.metrics.forEach((item) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = item.title;
    btn.classList.toggle("active", item.id === state.metricId);
    btn.addEventListener("click", () => openDetails(state.type, item.id));
    li.append(btn);
    menu.append(li);
  });

  const rowsWrap = byId("detailRows");
  rowsWrap.innerHTML = "";
  metric.rows.forEach((row, idx) => {
    const div = document.createElement("article");
    div.className = "detail-row";
    div.innerHTML = `
      <span>${idx + 1}</span>
      <div class="name-cell">
        <span class="avatar" style="background:${row.color}">${initials(row.name)}</span>
        <span>${row.name}</span>
      </div>
      <span>${row.team}</span>
      <span>${row.cost}</span>
      <span class="value">${row.value}</span>
    `;
    rowsWrap.append(div);
  });
}

function renderView() {
  const showDetails = new URLSearchParams(location.search).get("view") === "details";
  byId("overviewView").classList.toggle("hidden", showDetails);
  byId("detailView").classList.toggle("hidden", !showDetails);
  if (showDetails) renderDetail();
}

async function init() {
  const response = await fetch("./data/stats.json");
  state.data = await response.json();

  byId("seasonTitle").textContent = state.data.season;
  byId("raceCount").textContent = state.data.races;

  buildSummaryRows(state.data.headlineRows);
  buildCards(state.data.driverCards, "driverCards", "driver");
  buildCards(state.data.constructorCards, "constructorCards", "constructor");

  document.querySelectorAll("[data-open-details]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const type = link.dataset.openDetails;
      openDetails(type, state.data.details[type].metrics[0].id);
    });
  });

  byId("backToOverview").addEventListener("click", goToOverview);

  ["driverTab", "constructorTab"].forEach((id) => {
    byId(id).addEventListener("click", () => {
      const type = byId(id).dataset.type;
      openDetails(type, state.data.details[type].metrics[0].id);
    });
  });

  const params = new URLSearchParams(location.search);
  state.type = params.get("type") || "driver";
  state.metricId = params.get("metric") || state.data.details[state.type].metrics[0].id;

  renderView();
}

init();
