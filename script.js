// Variables para la webcam, el modelo y el clasificador
let webCam,
  model = null;
const classifier = knnClassifier.create();

// Botones para el entrenamiento y la carga del modelo
const btnLoad = document.getElementById("btnLoad"),
  btnSave = document.getElementById("btnSave"),
  btnTraining = document.getElementById("btnTraining"),
  btnInput = document.getElementById("btnInput");

// Indica si el modelo se está entrenando o no
let isTraining = false;

// Añadir una imagen a la clase de entrenamiento
const addImageExample = async (classId) => {
  console.log(classId);
  if (!isTraining) {
    return alert(
      'El modelo no se está entrenando, presiona el botón "Entrenar" para entrenar el modelo.'
    );
  }

  const img = await webCam.capture();
  const activation = model.infer(img, "conv_preds");
  classifier.addExample(activation, classId);
  img.dispose();
};

// Función principal
const app = async () => {
  try {
    // Iniciar la webcam
    const webCamElement = document.getElementById("webcam");
    webCam = await tf.data.webcam(webCamElement);

    // Carga el modelo k-NN
    model = await mobilenet.load();

    const interval = setInterval(async () => {
      // Verificar si hay un modelo cargado o entrenado
      if (model !== null && classifier.getNumClasses() > 0) {
        // Leer la imagen de la webcam
        const img = await webCam.capture();
        const activation = model.infer(img, "conv_preds");
        const result = await classifier.predictClass(activation);

        // Mostrar la predicción
        document.getElementById("result").innerHTML = `
          <p class="result-label">${result.label}</p>
          <p class="result-probability"><b>Probabilidad:</b> ${parseInt(
            result.confidences[result.label] * 100
          )}%</p>
          `;

        console.log(result.label);

        // Liberar la memoria
        img.dispose();
      } else {
        // Mostrar un mensaje mientras no haya modelo
        document.getElementById("result").innerHTML = `
          <p>No hay un modelo cargado. Por favor, entrenar el modelo o cargar uno existente desde un archivo JSON.</p>
        `;
      }
    }, 500); // Hace una predicción cada 0.5 segundos

    // Limpiar el intervalo cuando se cierre la ventana
    window.addEventListener("beforeunload", () => {
      clearInterval(interval);
    });
  } catch (error) {
    console.error("Error al cargar el modelo:", error);
  }
};

// Eventos de click en los botones del alfabeto
const buttons = document.getElementsByClassName("btnAlph");
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", () => {
    // Obtiene la letra del botón y la añade al modelo
    const classId = buttons[i].textContent;
    addImageExample(classId);
  });
}

// Cargar el modelo
btnLoad.addEventListener("click", async () => {
  const input = document.createElement("input"); // Crear un input
  input.type = "file"; // Establecer el tipo de input a file
  input.accept = ".json"; // Aceptar solo archivos JSON

  input.onchange = async () => {
    const file = input.files[0];
    if (file) {
      try {
        const jsonContent = await file.text(); // Leer el archivo
        const loadedDataset = JSON.parse(jsonContent); // Convertir a JSON
        const tensorObj = Object.entries(loadedDataset).reduce(
          // Convertir a tensores
          (obj, [classId, data]) => {
            obj[classId] = tf.tensor(data.data, data.shape, data.dtype);
            return obj;
          },
          {}
        );

        classifier.setClassifierDataset(tensorObj); // Cargar el dataset
      } catch (error) {
        console.error(
          "Error al cargar el modelo desde el archivo JSON:",
          error
        );
      }
    }
  };

  input.click(); // Simular un click en el input
});

// Entrenar el modelo
btnTraining.addEventListener("click", () => {
  if (!model) {
    return alert(
      "El clasificador no está cargado. Espera unos segundos e intenta de nuevo."
    );
  }

  // Activar el modo de entrenamiento
  isTraining = !isTraining;
  btnTraining.innerText = "Entrenando...";
  btnTraining.disabled = true;
  btnSave.disabled = false;
});

// Guardar el modelo
btnSave.addEventListener("click", async () => {
  if (!isTraining) {
    return alert(
      'El modelo no se está entrenando, presiona el botón "Entrenar" para entrenar el modelo.'
    );
  }

  const dataset = classifier.getClassifierDataset();

  // Ajustar la estructura del dataset
  const adjustedDataset = Object.entries(dataset).reduce(
    (obj, [classId, data]) => {
      obj[classId] = {
        data: Array.from(data.dataSync()), // Convertir a un array
        shape: data.shape,
        dtype: data.dtype,
      };
      return obj;
    },
    {}
  );

  const jsonDataset = JSON.stringify(adjustedDataset); // Convertir a JSON

  // Crear un Blob con el JSON
  const blob = new Blob([jsonDataset], { type: "application/json" });

  // Crear un enlace de descarga
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "modelo_entrenado.json";

  // Simular un clic en el enlace para iniciar la descarga
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Desactivar el modo de entrenamiento.
  isTraining = false;
  btnTraining.innerText = "Entrenar";
  btnTraining.disabled = false;
  btnSave.disabled = true;
});

// Evento de click en el botón de la palabra completa
btnInput.addEventListener("click", () => {
  // Obtener la palabra del input
  const fieldInput = document.getElementById("fieldInput");
  const word = fieldInput.value;

  if (word === "") {
    return alert("Por favor, ingresa una palabra.");
  }

  addImageExample(word); // Añadir la palabra al modelo
});

app();
