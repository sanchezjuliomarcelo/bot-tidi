// Variables globales
let botFlows = {}; // Objeto donde se cargarán los flujos
let currentFlow = ""; // Estado actual del bot

// Estructura para guardar los datos de flowGarantiaPosventaRegistro
let posventaData = {
  step: 0,           // Indica en cuál de los 3 datos estamos
  name: "",
  email: "",
  product: ""
};

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

async function loadFlows() {
  try {
    const flowPromises = flowFiles.map(file => fetch(file).then(res => res.json()));
    const flowData = await Promise.all(flowPromises);

    botFlows = Object.assign({}, ...flowData);
    
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
  } catch (error) {
    console.error("Error al cargar los flujos:", error);
    appendMessage("bot", "Hubo un error al cargar la conversación.");
  }
}

/**
 * Función para insertar mensajes en el chat.
 */
function appendMessage(sender, text, images = [], buttons = [], followUp = null) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add(sender === "bot" ? "bot-message" : "user-message");

  let htmlContent = `<p>${text.replace(/\n/g, "<br>")}</p>`;

  // Si hay imágenes
  if (images.length > 0) {
    images.forEach(imgSrc => {
      htmlContent += `<img src="${imgSrc}" class="promo-image" alt="Promoción">`;
    });
  }

  // Si hay botones
  if (buttons.length > 0) {
    buttons.forEach(button => {
      htmlContent += `<p><a href="${button.url}" target="_blank" class="button">${button.text}</a></p>`;
    });
  }

  msgDiv.innerHTML = htmlContent;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // followUp
  if (followUp) {
    setTimeout(() => appendMessage("bot", followUp), 500);
  }
}

function handleUserInput() {
  const input = userInput.value.trim();
  if (!input) return;

  appendMessage("user", input);
  const upperInput = input.toUpperCase();

  // Valida el flow actual
  if (!botFlows[currentFlow]) {
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
    userInput.value = "";
    return;
  }

  // Lógica interna para flowGarantiaPosventaRegistro
  if (currentFlow === "flowGarantiaPosventaRegistro") {
    handlePosventaRegistro(input);
    userInput.value = "";
    return;
  }

  // Lógica específica para reclamo de garantías (fecha)
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
      appendMessage("bot", "⚠️ Formato incorrecto. Por favor, ingrese la fecha en formato DD/MM/AAAA.");
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

    const nextFlowKey = optionsKeys[upperInput];
    if (nextFlowKey && botFlows[nextFlowKey]) {
      currentFlow = nextFlowKey;
      const images = botFlows[currentFlow].images || [];
      const buttons = botFlows[currentFlow].buttons || [];
      const followUp = botFlows[currentFlow].followUp || null;

      appendMessage("bot", botFlows[currentFlow].message, images, buttons, followUp);
    } else {
      appendMessage("bot", "No entendí esa opción. Por favor, intente de nuevo.");
    }
  } else {
    // Si no hay options, volver a menú principal
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
  }

  userInput.value = "";
}

// Manejo de la captura de datos en flowGarantiaPosventaRegistro
function handlePosventaRegistro(input) {
  // Chequear si el usuario quiere volver
  const upperInput = input.toUpperCase();
  if (upperInput === "M") {
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
    resetPosventaData();
    return;
  }
  if (upperInput === "B") {
    currentFlow = "flowGarantias";
    appendMessage("bot", botFlows[currentFlow].message);
    resetPosventaData();
    return;
  }

  // Lógica de 3 pasos: Name, Email, Product
  switch (posventaData.step) {
    case 0:
      // Primer dato: Nombre
      posventaData.name = input;
      posventaData.step = 1;
      appendMessage("bot", "✉️ Ahora, ingrese su correo electrónico:");
      break;

    case 1:
      // Segundo dato: Email
      posventaData.email = input;
      posventaData.step = 2;
      appendMessage("bot", "📦 Finalmente, indique el nombre del producto:");
      break;

    case 2:
      // Tercer dato: Producto
      posventaData.product = input;
      // Ya tenemos los 3 datos
      appendMessage("bot", "Perfecto, lo estamos derivando con un asesor.");
      // derivar
      currentFlow = "flowAsesor";
      appendMessage("bot", botFlows[currentFlow].message);
      // Reset data
      resetPosventaData();
      break;
  }
}

function resetPosventaData() {
  posventaData = {
    step: 0,
    name: "",
    email: "",
    product: ""
  };
}

/**
 * Verifica si una fecha ingresada tiene un formato válido (DD/MM/AAAA).
 */
function isValidDate(dateString) {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dateString.match(regex)) return false;

  const [day, month, year] = dateString.split("/").map(Number);
  const date = new Date(year, month - 1, day);

  return (date instanceof Date && !isNaN(date) &&
          date.getDate() === day &&
          date.getMonth() === month - 1);
}

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
userInput.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    handleUserInput();
  }
});
