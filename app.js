// ------------------- Variables globales -------------------
let botFlows   = {};
let currentFlow = "";

// Datos para flowGarantiaPosventaRegistro
let posventaData = { step: 0, name: "", email: "", product: "" };

// ------------------- DOM -------------------
const chatWindow = document.getElementById("chat-window");
const userInput  = document.getElementById("user-input");
const sendBtn    = document.getElementById("send-btn");

// ------------------- Archivos -------------------
const flowFiles = [
  "menu.json",
  "asesoramiento.json",
  "promociones.json",
  "quierocomprar.json",
  "modificaciones.json",
  "cancelaciones.json",
  "garantias.json"
];

// ------------------- Cargar flujos -------------------
async function loadFlows () {
  try {
    const data = await Promise.all(
      flowFiles.map(f => fetch(f).then(r => r.json()))
    );
    botFlows    = Object.assign({}, ...data);
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
  } catch (e) {
    console.error(e);
    appendMessage("bot", "Hubo un error al iniciar la conversación.");
  }
}

// ------------------- Append Message -------------------
function appendMessage (sender, text, images = [], buttons = [], followUp = null) {
  const msg = document.createElement("div");
  msg.classList.add(sender === "bot" ? "bot-message" : "user-message");

  let html = `<p>${text.replace(/\n/g, "<br>")}</p>`;

  images.forEach(src => {
    html += `<img src="${src}" class="promo-image" alt="Imagen">`;
  });
  buttons.forEach(b => {
    html += `<p><a href="${b.url}" target="_blank" class="button">${b.text}</a></p>`;
  });

  msg.innerHTML = html;
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  if (followUp) {
    setTimeout(() => appendMessage("bot", followUp), 500);
  }
}

// ------------------- Utilidades -------------------
const isNumeric  = t => /^[0-9]{7,12}$/.test(t); // 7-12 dígitos (DNI, CUIT o pedido)
const isValidDate = d => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return false;
  const [day, m, y] = d.split("/").map(Number);
  const date = new Date(y, m - 1, day);
  return date instanceof Date && !isNaN(date) &&
         date.getDate() === day && date.getMonth() === m - 1;
};
const calculateDaysSince = d => {
  const [day, m, y] = d.split("/").map(Number);
  return Math.ceil((Date.now() - new Date(y, m - 1, day)) / 8.64e7);
};

// ------------------- Handler principal -------------------
function handleUserInput () {
  const raw = userInput.value.trim();
  if (!raw) return;

  appendMessage("user", raw);
  const up = raw.toUpperCase();

  // --- Validación de flujo ---
  if (!botFlows[currentFlow]) {
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
    userInput.value = "";
    return;
  }

  // === 1. Registro posventa ===
  if (currentFlow === "flowGarantiaPosventaRegistro") {
    handlePosventaRegistro(raw);
    userInput.value = "";
    return;
  }

  // === 2. Fechas (DOA vs posventa) ===
  if (["flowFechaRecepcionMarcaEspecial", "flowFechaRecepcionOtrasMarcas"].includes(currentFlow)) {
    if (isValidDate(raw)) {
      const d = calculateDaysSince(raw);
      currentFlow = d <= 10 ? "flowDOA"
                 : currentFlow === "flowFechaRecepcionMarcaEspecial"
                     ? "flowGarantia"
                     : "flowDerivaGarantias";
      const cfg = botFlows[currentFlow];
      appendMessage("bot", cfg.message, cfg.images || [], cfg.buttons || []);
    } else {
      appendMessage("bot", "⚠️ Formato incorrecto. Ingrese DD/MM/AAAA.");
    }
    userInput.value = "";
    return;
  }

  const flowCfg = botFlows[currentFlow];

  // === 3. Opción automática __AUTO__ ===
  if (flowCfg.options && flowCfg.options["__AUTO__"]) {
    currentFlow = flowCfg.options["__AUTO__"];
    const cfg = botFlows[currentFlow];
    appendMessage("bot", cfg.message, cfg.images || [], cfg.buttons || [], cfg.followUp || null);
    userInput.value = "";
    return;
  }

  // === 4. dynamicInput para DNI / pedido ===
  if (flowCfg.dynamicInput && isNumeric(raw)) {
    currentFlow = flowCfg.dynamicInput;
    const cfg = botFlows[currentFlow];
    appendMessage("bot", cfg.message, cfg.images || [], cfg.buttons || [], cfg.followUp || null);
    userInput.value = "";
    return;
  }

  // === 5. Flujos estándar (options) ===
  if (flowCfg.options) {
    const options = Object.keys(flowCfg.options).reduce((a, k) => {
      a[k.toUpperCase()] = flowCfg.options[k];
      return a;
    }, {});

    const next = options[up];
    if (next && botFlows[next]) {
      currentFlow = next;
      const cfg = botFlows[currentFlow];
      appendMessage("bot", cfg.message, cfg.images || [], cfg.buttons || [], cfg.followUp || null);
    } else {
      appendMessage("bot", "No entendí esa opción. Por favor, intente de nuevo.");
    }
  } else {
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
  }

  userInput.value = "";
}

// ------------------- Registro posventa -------------------
function handlePosventaRegistro (raw) {
  const up = raw.toUpperCase();

  if (up === "M") {
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
    resetPosventa();
    return;
  }
  if (up === "B") {
    currentFlow = "flowGarantias";
    appendMessage("bot", botFlows[currentFlow].message);
    resetPosventa();
    return;
  }

  switch (posventaData.step) {
    case 0:
      posventaData.name = raw;
      posventaData.step = 1;
      appendMessage("bot", "✉️ Ingrese su correo electrónico:");
      break;
    case 1:
      posventaData.email = raw;
      posventaData.step = 2;
      appendMessage("bot", "📦 Indique el nombre del producto:");
      break;
    case 2:
      posventaData.product = raw;
      appendMessage("bot", "Perfecto, lo estamos derivando con un asesor.");
      currentFlow = "flowAsesor";
      appendMessage("bot", botFlows[currentFlow].message);
      resetPosventa();
      break;
  }
}
function resetPosventa () {
  posventaData = { step: 0, name: "", email: "", product: "" };
}

// ------------------- Inicio y eventos -------------------
loadFlows();
sendBtn.addEventListener("click", handleUserInput);
userInput.addEventListener("keypress", e => {
  if (e.key === "Enter") handleUserInput();
});
