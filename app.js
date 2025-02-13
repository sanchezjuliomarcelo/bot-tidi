// Variables globales
let botFlows = {}; // Objeto donde se cargarán los flujos
let currentFlow = ""; // Estado actual del bot

// Referencias al DOM
const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// Archivos JSON a cargar
const flowFiles = [
  "menu.json",
  "asesoramiento.json",
  "promociones.json",
  "quierocomprar.json",
  "modificaciones.json",
  "cancelaciones.json",
  "garantias.json"
];

/**
 * Cargar todos los JSON y combinarlos en `botFlows`
 */
async function loadFlows() {
  try {
    const flowPromises = flowFiles.map(file => fetch(file).then(res => res.json()));
    const flowData = await Promise.all(flowPromises);

    // Fusionar todos los JSON en `botFlows`
    botFlows = Object.assign({}, ...flowData);
    
    // Iniciar en el menú principal
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
  } catch (error) {
    console.error("Error al cargar los flujos:", error);
    appendMessage("bot", "Hubo un error al cargar la conversación.");
  }
}

/**
 * Función para insertar mensajes en el chat.
 * @param {string} sender - 'bot' o 'user'.
 * @param {string} text - El texto a mostrar.
 * @param {array} images - Lista de imágenes a mostrar.
 * @param {array} buttons - Lista de botones con `text` y `url`.
 * @param {string} followUp - Mensaje adicional para seguir con la conversación.
 */
function appendMessage(sender, text, images = [], buttons = [], followUp = null) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add(sender === "bot" ? "bot-message" : "user-message");

  let htmlContent = `<p>${text.replace(/\n/g, "<br>")}</p>`;

  if (images.length > 0) {
    images.forEach(imgSrc => {
      htmlContent += `<img src="${imgSrc}" class="promo-image" alt="Promoción">`;
    });
  }

  if (buttons.length > 0) {
    buttons.forEach(button => {
      htmlContent += `<p><a href="${button.url}" target="_blank" class="button">${button.text}</a></p>`;
    });
  }

  msgDiv.innerHTML = htmlContent;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  if (followUp) {
    setTimeout(() => appendMessage("bot", followUp), 500);
  }
}

/**
 * Maneja el input del usuario y la navegación entre flujos.
 */
function handleUserInput() {
  const input = userInput.value.trim().toUpperCase();
  if (!input) return;

  appendMessage("user", input);

  if (!botFlows[currentFlow]) {
    appendMessage("bot", "Error: flujo no encontrado. Regresando al Menú Principal...");
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
    return;
  }

  // Lógica específica para el flujo de asesoramiento
  if (currentFlow.startsWith("flowAsesoramiento")) {
    if (!botFlows[currentFlow].options[input] && input.length > 3) {
      currentFlow = "flowAsesor";
      appendMessage("bot", botFlows[currentFlow].message);
      return;
    }
  }

  // Si el usuario está ingresando una fecha en el flujo de reclamos
  if (currentFlow === "flowRegistrarReclamoFecha") {
    if (isValidDate(input)) {
      const diasDesdeRecepcion = calculateDaysSince(input);

      if (diasDesdeRecepcion <= 10) {
        currentFlow = "flowDOA"; // Producto dentro de DOA
      } else {
        currentFlow = "flowGarantiaPosventaMarcas"; // Producto va a Garantía Posventa
      }

      appendMessage("bot", botFlows[currentFlow].message);
    } else {
      appendMessage("bot", "⚠️ Formato incorrecto. Por favor, ingresá la fecha en formato DD/MM/AAAA.");
    }
    userInput.value = "";
    return;
  }

  // Manejo de flujos estándar
  const flowConfig = botFlows[currentFlow];

  if (flowConfig.options) {
    // Convertimos las claves del JSON a mayúsculas para que coincidan con la entrada del usuario
    const optionsKeys = Object.keys(flowConfig.options).reduce((acc, key) => {
      acc[key.toUpperCase()] = flowConfig.options[key];
      return acc;
    }, {});

    const nextFlowKey = optionsKeys[input]; // Buscar la opción convertida a mayúsculas

    if (nextFlowKey && botFlows[nextFlowKey]) {
      currentFlow = nextFlowKey;
      
      // Extraer los botones y el mensaje de seguimiento del nuevo flujo, si existen
      const buttons = botFlows[currentFlow].buttons || [];
      const followUp = botFlows[currentFlow].followUp || null;

      // Mostrar el mensaje del nuevo flujo con sus botones y mensaje adicional si aplica
      appendMessage("bot", botFlows[currentFlow].message, [], buttons, followUp);
    } else {
      appendMessage("bot", "No entendí esa opción. Por favor, intenta de nuevo.");
    }
  } else {
    appendMessage("bot", "Regresando al Menú Principal...");
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
  }

  userInput.value = "";
}

/**
 * Verifica si una fecha ingresada tiene un formato válido (DD/MM/AAAA)
 * @param {string} dateString - Fecha en formato string.
 * @returns {boolean} - True si es válida, False si no.
 */
function isValidDate(dateString) {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dateString.match(regex)) return false;

  const [day, month, year] = dateString.split("/").map(Number);
  const date = new Date(year, month - 1, day);

  return date instanceof Date && !isNaN(date) && date.getDate() === day && date.getMonth() === month - 1;
}

/**
 * Calcula cuántos días han pasado desde una fecha dada hasta hoy.
 * @param {string} dateString - Fecha en formato DD/MM/AAAA.
 * @returns {number} - Días transcurridos desde esa fecha hasta hoy.
 */
function calculateDaysSince(dateString) {
  const [day, month, year] = dateString.split("/").map(Number);
  const receivedDate = new Date(year, month - 1, day);
  const today = new Date();

  const diffTime = today - receivedDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Llamar a la función de carga al inicio
loadFlows();

// Eventos
sendBtn.addEventListener("click", handleUserInput);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleUserInput();
  }
});
