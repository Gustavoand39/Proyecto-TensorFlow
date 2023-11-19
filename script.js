// Variables para la webcam, el modelo y el clasificador
let webCam,
  model = null;
const classifier = knnClassifier.create();

// Botones para el entrenamiento y la carga del modelo
const btnLoad = document.getElementById("btnLoad"),
  btnSave = document.getElementById("btnSave"),
  btnTraining = document.getElementById("btnTraining");

// Indica si el modelo se está entrenando o no
let isTraining = false;

const classes = {
  1: "A",
  2: "B",
  3: "C",
  4: "D",
  5: "E",
  6: "F",
  7: "G",
  8: "H",
  9: "I",
  10: "J",
  11: "K",
  12: "L",
  13: "M",
  14: "N",
  15: "Ñ",
  16: "O",
  17: "P",
  18: "Q",
  19: "R",
  20: "S",
  21: "T",
  22: "U",
  23: "V",
  24: "W",
  25: "X",
  26: "Y",
  27: "Z",
};

// Añadir una imagen a la clase de entrenamiento
const addImageExample = async (classId) => {
  if (isTraining) {
    const img = await webCam.capture();
    const activation = model.infer(img, "conv_preds");
    classifier.addExample(activation, classId);
    img.dispose();
  } else {
    alert('El modelo no se está entrenando, presiona el botón "Entrenar"');
  }
};

// Función principal
const app = async () => {
  try {
    // Iniciar la webcam
    const webCamElement = document.getElementById("webcam");
    webCam = await tf.data.webcam(webCamElement);

    // Carga un modelo pre-entrenado
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
          <p><b>Letra:</b> ${classes[result.label]}</p>
          <p><b>Probabilidad:</b> ${result.confidences[result.label]}</p>
          `;

        // Liberar la memoria
        img.dispose();
      } else {
        // Mostrar un mensaje mientras no haya modelo
        document.getElementById("result").innerHTML = `
          <p>Modelo de entrenamiento no disponible. Por favor, 
          entrena o carga un modelo antes de intentar una predicción.</p>
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
const buttons = document.getElementsByClassName("training-btn");
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", () => {
    // Obtiene la posición del valor y lo agrega como ejemplo
    const classId = buttons[i].getAttribute("data-position");
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
        const tensorObj = Object.entries(loadedDataset).reduce( // Convertir a tensores
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
    alert("El modelo no se ha cargado, por favor espera unos segundos");
    return;
  }

  // Activar el modo de entrenamiento
  isTraining = !isTraining;
  btnTraining.innerText = "Entrenando...";
  btnTraining.disabled = true;
  btnSave.disabled = false;
});

// Guardar el modelo
btnSave.addEventListener("click", async () => {
  if (isTraining) {
    // Guardar el modelo solo si está en modo de entrenamiento.
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
  }

  // Desactivar el modo de entrenamiento.
  isTraining = false;
  btnTraining.innerText = "Entrenar";
  btnTraining.disabled = false;
  btnSave.disabled = true;
});

app();
