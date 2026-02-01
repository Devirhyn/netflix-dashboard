<script>
/* ===============================
   CONFIG
================================ */
const DATA_URL = "./sample_titles_500.json";

/* ===============================
   HELPERS
================================ */
const clean = v => (v ?? "").toString().trim();
const isMissing = v => !v || ["Not Given", "N/A", "Unknown"].includes(v);

function splitComma(val){
  return clean(val)
    .split(",")
    .map(v => v.trim())
    .filter(v => v && !isMissing(v));
}

function countMap(){
  return new Map();
}

function topN(map, n=5){
  return [...map.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,n);
}

function formatInt(n){
  return new Intl.NumberFormat().format(n);
}

function escapeHTML(str){
  return str.replace(/[&<>"']/g, m =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])
  );
}

/* ===============================
   STATE
================================ */
let RAW = [];
let charts = {};

/* ===============================
   LOAD DATA
================================ */
async function loadData(){
  const res = await fetch(DATA_URL, { cache:"no-store" });
  if(!res.ok) throw new Error("Gagal load JSON");
  return res.json();
}

/* ===============================
   FILTER
================================ */
function getFiltered(){
  const type = document.getElementById("typeFilter").value;
  return RAW.filter(r => type === "ALL" || clean(r.type) === type);
}

/* ===============================
   KPI
================================ */
function renderKPI(rows){
  const total = rows.length;
  const movie = rows.filter(r=>r.type==="Movie").length;
  const tv = rows.filter(r=>r.type==="TV Show").length;

  const countryMap = countMap();
  const genreMap = countMap();

  rows.forEach(r=>{
    splitComma(r.country).forEach(c =>
      countryMap.set(c,(countryMap.get(c)||0)+1)
    );
    splitComma(r.listed_in).forEach(g =>
      genreMap.set(g,(genreMap.get(g)||0)+1)
    );
  });

  const avgDuration = (() => {
    const d = rows
      .filter(r=>r.type==="Movie" && +r.duration_reg_num)
      .map(r=>+r.duration_reg_num);
    return d.length ? Math.round(d.reduce((a,b)=>a+b,0)/d.length) : "—";
  })();

  document.getElementById("kpiTotal").textContent = formatInt(total);
  document.getElementById("kpiMix").textContent =
    total ? `${Math.round(movie/total*100)}% / ${Math.round(tv/total*100)}%` : "—";
  document.getElementById("kpiCountry").textContent =
    topN(countryMap,1)[0]?.[0] || "—";
  document.getElementById("kpiGenre").textContent =
    topN(genreMap,1)[0]?.[0] || "—";
  document.getElementById("kpiDuration").textContent = avgDuration;
}

/* ===============================
   CHART BUILDERS
================================ */
function buildChart(id, type, labels, data){
  if(charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), {
    type,
    data:{
      labels,
      datasets:[{
        data,
        backgroundColor:[
          "#6ee7ff","#a78bfa","#34d399","#fbbf24","#fb7185"
        ]
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{ legend:{labels:{color:"#e9eefc"}} },
      scales: type==="line" ? {
        x:{ticks:{color:"#a7b3d6"}},
        y:{ticks:{color:"#a7b3d6"}}
      } : {}
    }
  });
}

/* ===============================
   RENDER CHARTS
================================ */
function renderCharts(rows){
  // Trend
  const yearMap = countMap();
  rows.forEach(r=>{
    if(r.year_added) yearMap.set(r.year_added,(yearMap.get(r.year_added)||0)+1);
  });
  const years = [...yearMap.keys()].sort();
  buildChart(
    "chartTrend",
    "line",
    years,
    years.map(y=>yearMap.get(y))
  );

  // Type mix
  buildChart(
    "chartType",
    "doughnut",
    ["Movie","TV Show"],
    [
      rows.filter(r=>r.type==="Movie").length,
      rows.filter(r=>r.type==="TV Show").length
    ]
  );

  // Country
  const countryMap = countMap();
  rows.forEach(r=>{
    splitComma(r.country).forEach(c =>
      countryMap.set(c,(countryMap.get(c)||0)+1)
    );
  });
  const topCountry = topN(countryMap);
  buildChart(
    "chartCountries",
    "bar",
    topCountry.map(d=>d[0]),
    topCountry.map(d=>d[1])
  );

  // Rating
  const ratingMap = countMap();
  rows.forEach(r=>{
    if(!isMissing(r.rating))
      ratingMap.set(r.rating,(ratingMap.get(r.rating)||0)+1);
  });
  const topRating = topN(ratingMap);
  buildChart(
    "chartRatings",
    "bar",
    topRating.map(d=>d[0]),
    topRating.map(d=>d[1])
  );

  // Genre
  const genreMap = countMap();
  rows.forEach(r=>{
    splitComma(r.listed_in).forEach(g =>
      genreMap.set(g,(genreMap.get(g)||0)+1)
    );
  });
  const topGenre = topN(genreMap);
  buildChart(
    "chartGenres",
    "bar",
    topGenre.map(d=>d[0]),
    topGenre.map(d=>d[1])
  );
}

/* ===============================
   TABLE
================================ */
function renderTopTitles(rows){
  const top = rows
    .filter(r=>+r.duration_reg_num)
    .sort((a,b)=>b.duration_reg_num-a.duration_reg_num)
    .slice(0,5);

  document.getElementById("topTitles").innerHTML =
    top.map(t=>`
      <tr>
        <td style="padding:10px">${escapeHTML(t.title)}</td>
        <td style="padding:10px;text-align:right;color:#a7b3d6">
          ${escapeHTML(t.duration)}
        </td>
      </tr>
    `).join("");
}

/* ===============================
   REFRESH
================================ */
function refresh(){
  const rows = getFiltered();
  renderKPI(rows);
  renderCharts(rows);
  renderTopTitles(rows);
}

/* ===============================
   INIT
================================ */
(async function(){
  RAW = await loadData();
  document.getElementById("typeFilter").addEventListener("change", refresh);
  refresh();
  document.getElementById("loading").style.display="none";
})();
</script>
