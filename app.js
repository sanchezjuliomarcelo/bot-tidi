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
  "garantias.json",
   // Se agregó promociones.json para que lo cargue correctamente
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
 * @param {object} link - Objeto con `text` y `url` para el enlace.
 */
function appendMessage(sender, text, images = [], link = null) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add(sender === "bot" ? "bot-message" : "user-message");

  let htmlContent = `<p>${text.replace(/\n/g, "<br>")}</p>`;

  // Si hay imágenes, agregarlas
  if (images.length > 0) {
    images.forEach(imgSrc => {
      htmlContent += `<img src="${imgSrc}" class="promo-image" alt="Promoción">`;
    });
  }

  // Si hay un enlace, mostrarlo con un icono clickeable
  if (link) {
    htmlContent += `<p><a href="${link.url}" target="_blank" class="promo-link">🔗 ${link.text}</a></p>`;
  }

  msgDiv.innerHTML = htmlContent;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/**
 * Maneja el input del usuario y la navegación entre flujos.
 */
function handleUserInput() {
  const input = userInput.value.trim();
  if (!input) return;

  appendMessage("user", input);

  if (!botFlows[currentFlow]) {
    appendMessage("bot", "Error: flujo no encontrado. Regresando al Menú Principal...");
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
    return;
  }

  const flowConfig = botFlows[currentFlow];

  if (flowConfig.options) {
    const nextFlowKey = flowConfig.options[input];

    if (nextFlowKey && botFlows[nextFlowKey]) {
      currentFlow = nextFlowKey;

      // Si es el flujo de promociones, cargar imágenes y link
      if (currentFlow === "flowPromociones") {
        appendMessage(
          "bot",
          botFlows[currentFlow].message,
          botFlows[currentFlow].images,
          botFlows[currentFlow].link
        );
      } else {
        appendMessage("bot", botFlows[currentFlow].message);
      }
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

// Llamar a la función de carga al inicio
loadFlows();

// Eventos
sendBtn.addEventListener("click", handleUserInput);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleUserInput();
  }
});
