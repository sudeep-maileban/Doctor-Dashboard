// ====== WebSocket ======
const socket = new WebSocket("wss://esp32-dashboard-1.onrender.com");

// ====== Leaflet Map Setup ======
let map, marker;
let currentPos = [17.3297, 76.8343]; // default

let tileLayer; // ✅ Add this at the top of your JS file (global scope)

function initMap() {
  map = L.map("leafletMap").setView(currentPos, 15);
  setMapType("osm"); // ✅ Use roadmap as default
  marker = L.marker(currentPos).addTo(map).bindPopup("Ambulance");
}
function setMapType(type) {
  if (!map) return;

  // Remove existing tile layer
  if (tileLayer) {
    map.removeLayer(tileLayer);
  }

  // Choose tile layer based on type
  switch (type) {
    case "satellite":
      tileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles © Esri"
      });
      break;

    case "hybrid":
      tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      });
      // You can overlay labels here if needed
      break;

    case "osm":
    default:
      tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      });
      break;
  }

  tileLayer.addTo(map);
}

// ====== Panels ======
function showPanel(id) {
  const container = document.getElementById("panelContainer"); // ✅ NEW: Get the container to toggle 'all-view' class

  if (id === "all") {
    // ✅ NEW: If 'all' is selected, show all panels and apply layout
    container.classList.add("all-view"); // ✅ NEW: Add layout class for side-by-side view
    document.querySelectorAll(".panel").forEach((p) => p.classList.add("active")); // ✅ NEW: Activate all panels

    // ✅ OPTIONAL: Fix map glitch when 'all' view is active
    if (map) {
      setTimeout(() => {
        map.invalidateSize();
        map.setView(currentPos, map.getZoom());
      }, 200);
    }
  } else {
    // ✅ UPDATED: Reset layout and show only selected panel
    container.classList.remove("all-view"); // ✅ NEW: Remove layout class if not 'all'
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active")); // ✅ UNCHANGED: Hide all panels
    document.getElementById(id).classList.add("active"); // ✅ UNCHANGED: Show selected panel

    // ✅ UNCHANGED: Fix map glitch when switching to location panel
    if (id === "location" && map) {
      setTimeout(() => {
        map.invalidateSize();
        map.setView(currentPos, map.getZoom());
      }, 200);
    }
  }
}

// ====== WebSocket Incoming Data ======
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  document.getElementById("heartRate").innerText = data.heartRate || "--";
  document.getElementById("spo2").innerText = data.spo2 || "--";
  document.getElementById("temperature").innerText = data.temperature || "--";

  if (
  (data.spo2 && data.spo2 < 90) ||
  (data.heartRate && data.heartRate < 80) ||
  (data.temperature && data.temperature < 20)
) {
  document.getElementById("emergencyBanner").style.display = "block";
} else {
  document.getElementById("emergencyBanner").style.display = "none";
}

  if (data.lat && data.lng) {
    currentPos = [Number(data.lat), Number(data.lng)];
    marker.setLatLng(currentPos);
    map.setView(currentPos);
    document.getElementById("gpsStatus").innerText = "📍 GPS Signal Active";
  }
};

// ====== Search Nearby Hospitals ======
document.getElementById("searchHospitals").addEventListener("click", async () => {
  const [lat, lng] = currentPos;
  const list = document.getElementById("hospitalList");
  list.innerHTML = "Searching...";

  const delta = 0.05;
  const viewbox = `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=hospital&addressdetails=1&limit=10&bounded=1&viewbox=${viewbox}&email=test@gmail.com`;

  const response = await fetch(url);
  const results = await response.json();

  list.innerHTML = "";
  if (results.length === 0) {
    list.innerHTML = "<li>No hospitals found nearby.</li>";
    return;
  }

  results.forEach((place) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span>${place.display_name}</span>
      <button onclick='selectHospital("${place.display_name.replace(/"/g, "")}", ${place.lat}, ${place.lon})'>
        Select
      </button>
    `;

    list.appendChild(li);
  });
});

// ====== Send Selected Hospital to Driver ======
function selectHospital(name, lat, lng) {
  socket.send(
    JSON.stringify({
      type: "hospitalSelect",
      name,
      lat,
      lng,
    })
  );

  alert("Hospital sent to driver!");
}

window.onload = initMap;
