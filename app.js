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

  // Si hay imágenes, agregarlas
  if (images.length > 0) {
    images.forEach(imgSrc => {
      htmlContent += `<img src="${imgSrc}" class="promo-image" alt="Promoción">`;
    });
  }

  // Si hay botones, agregarlos
  if (buttons.length > 0) {
    buttons.forEach(button => {
      htmlContent += `<p><a href="${button.url}" target="_blank" class="button">${button.text}</a></p>`;
    });
  }

  msgDiv.innerHTML = htmlContent;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Si hay un followUp, se dispara luego de un pequeño retardo
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

  // Validar flow actual
  if (!botFlows[currentFlow]) {
    appendMessage("bot", "Error: flujo no encontrado. Regresando al Menú Principal...");
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
    userInput.value = "";
    return;
  }

  // Lógica especial: Cancelación de compra (flowCancelarCompra)
  if (currentFlow === "flowCancelarCompra") {
    // Chequear si 'input' es 'M' para volver al menú
    if (input === "M") {
      currentFlow = "menuPrincipal";
      appendMessage("bot", botFlows[currentFlow].message);
      userInput.value = "";
      return;
    }

    // Chequear si es un DNI válido (9 a 12 dígitos numéricos)
    if (isValidDNI(input)) {
      // Derivar a flowAsesorCancelacion
      currentFlow = "flowAsesorCancelacion";
      appendMessage("bot", botFlows[currentFlow].message);
      userInput.value = "";
      return;
    } else {
      // No es DNI válido => Continuar con flowMotivoCancelacion
      currentFlow = "flowMotivoCancelacion";
      appendMessage("bot", botFlows[currentFlow].message);
      userInput.value = "";
      return;
    }
  }

  // Lógica específica para el flujo de asesoramiento
  if (currentFlow.startsWith("flowAsesoramiento")) {
    if (!botFlows[currentFlow].options[input] && input.length > 3) {
      currentFlow = "flowAsesor";
      appendMessage("bot", botFlows[currentFlow].message);
      userInput.value = "";
      return;
    }
  }

  // Lógica específica para el flujo de reclamo de garantías (fecha)
  if (currentFlow === "flowRegistrarReclamoFecha") {
    if (isValidDate(input)) {
      const diasDesdeRecepcion = calculateDaysSince(input);
      if (diasDesdeRecepcion <= 10) {
        currentFlow = "flowDOA"; 
      } else {
        currentFlow = "flowGarantiaPosventaMarcas"; 
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
    // Convertir claves a mayúsculas
    const optionsKeys = Object.keys(flowConfig.options).reduce((acc, key) => {
      acc[key.toUpperCase()] = flowConfig.options[key];
      return acc;
    }, {});

    const nextFlowKey = optionsKeys[input];
    if (nextFlowKey && botFlows[nextFlowKey]) {
      currentFlow = nextFlowKey;

      // Extraer imágenes, botones, followUp
      const images = botFlows[currentFlow].images || [];
      const buttons = botFlows[currentFlow].buttons || [];
      const followUp = botFlows[currentFlow].followUp || null;

      appendMessage("bot", botFlows[currentFlow].message, images, buttons, followUp);
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
 * Validar DNI (entre 9 y 12 dígitos numéricos)
 * @param {string} input - Texto ingresado por el usuario
 * @returns {boolean} - True si cumple la condición
 */
function isValidDNI(input) {
  // Verificar que solo tenga dígitos y longitud de 9 a 12
  const dniRegex = /^[0-9]{9,12}$/;
  return dniRegex.test(input);
}

/**
 * Verifica si una fecha ingresada tiene un formato válido (DD/MM/AAAA).
 */
function isValidDate(dateString) {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dateString.match(regex)) return false;

  const [day, month, year] = dateString.split("/").map(Number);
  const date = new Date(year, month - 1, day);

  return (date instanceof Date &&
          !isNaN(date) &&
          date.getDate() === day &&
          date.getMonth() === month - 1);
}

/**
 * Calcula cuántos días han pasado desde una fecha dada hasta hoy.
 */
function calculateDaysSince(dateString) {
  const [day, month, year] = dateString.split("/").map(Number);
  const receivedDate = new Date(year, month - 1, day);
  const today = new Date();

  const diffTime = today - receivedDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Carga inicial
loadFlows();

// Eventos
sendBtn.addEventListener("click", handleUserInput);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleUserInput();
  }
});
