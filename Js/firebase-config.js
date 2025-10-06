// Js/firebase-config.js
// Contiene las credenciales de tu proyecto Firebase "maldito-cafe"
// Estas credenciales las copiaste de la Consola de Firebase.

const firebaseConfig = {
  apiKey: "AIzaSyCAWoAt7ImKtgnQepF9jTyGV0mPusWMTzA",
  authDomain: "maldito-cafe.firebaseapp.com",
  projectId: "maldito-cafe",
  storageBucket: "maldito-cafe.firebasestorage.app",
  messagingSenderId: "471022150149",
  appId: "1:471022150149:web:b74f1d3f54af3b010ab26c",
  measurementId: "G-S0X5TTK9R6" // Esto es para Analytics, no afecta a Firestore.
};

// Inicializa Firebase usando la API de compatibilidad (ya que tu HTML carga los SDK compat)
const app = firebase.initializeApp(firebaseConfig);

// Obtiene una referencia a la instancia de Cloud Firestore usando la API de compatibilidad
const db = firebase.firestore();

// Opcional: Para depuración, puedes ver si db se inicializa correctamente
console.log("Firestore inicializado en firebase-config.js. Instancia db:", db);

// Si también quieres Analytics, puedes usarlo así con el SDK compat:
// const analytics = firebase.analytics();
